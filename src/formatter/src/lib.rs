use jsonc_parser::cst::{CstContainerNode, CstLeafNode, CstNode, CstRootNode};
use jsonc_parser::ParseOptions;
use wasm_bindgen::prelude::*;

// A struct to hold the state of the formatting process.
// It now owns the output string, removing the need for a lifetime parameter.
struct FormatterState {
    output: String,
    indent_level: usize,
    indent_str: &'static str,
    is_on_new_line: bool,
}

impl FormatterState {
    // Appends a string to the output, handling indentation if necessary.
    fn push_str(&mut self, s: &str) {
        if self.is_on_new_line && !s.trim().is_empty() {
            self.output
                .push_str(&self.indent_str.repeat(self.indent_level));
            self.is_on_new_line = false;
        }
        self.output.push_str(s);
    }

    // Appends a newline character.
    fn push_newline(&mut self) {
        // To prevent multiple empty lines, trim and check before adding a newline.
        let trimmed_output = self.output.trim_end();
        if !trimmed_output.is_empty() {
            self.output.truncate(trimmed_output.len());
            self.output.push('\n');
        }
        self.is_on_new_line = true;
    }

    // Increases the indentation level.
    fn indent(&mut self) {
        self.indent_level += 1;
    }

    // Decreases the indentation level.
    fn dedent(&mut self) {
        if self.indent_level > 0 {
            self.indent_level -= 1;
        }
    }
}

#[wasm_bindgen(js_name = formatJson)]
pub fn format_json(input: &str) -> Result<String, JsValue> {
    let parse_options = ParseOptions {
        allow_comments: true,
        allow_trailing_commas: true,
        allow_loose_object_property_names: true,
    };

    let root_node = CstRootNode::parse(input, &parse_options)
        .map_err(|err| js_error(&format!("Parse Error: {err}")))?;

    // The FormatterState now initializes its own output string.
    let mut state = FormatterState {
        output: String::with_capacity(input.len() * 2),
        indent_level: 0,
        indent_str: "    ",
        is_on_new_line: false,
    };

    if let Some(value) = root_node.value() {
        format_node(&value, &mut state)?;
    }

    // Move the formatted string out of the state to be returned.
    let mut output = state.output;

    // Ensure the final output has a trailing newline
    if !output.is_empty() && !output.ends_with('\n') {
        output.push('\n');
    }

    Ok(output)
}

fn format_object(
    obj: &jsonc_parser::cst::CstObject,
    state: &mut FormatterState,
) -> Result<(), JsValue> {
    state.push_str("{");

    let properties = obj.properties();
    if !properties.is_empty() {
        state.indent();
        for (i, prop) in properties.iter().enumerate() {
            state.push_newline();

            // Format key
            let name = prop
                .name()
                .ok_or_else(|| js_error("Object property is missing a key"))?;
            let raw_name = name.as_string_lit().map(|literal| literal.raw_value());
            let key = match raw_name {
                Some(raw) if is_safe_json_string_literal(&raw) => raw,
                _ => encode_json_string(
                    &name
                        .decoded_value()
                        .map_err(|err| js_error(&format!("Invalid object key: {err}")))?,
                ),
            };
            state.push_str(&key);
            state.push_str(": ");

            // Format value
            let value_node = prop
                .value()
                .ok_or_else(|| js_error("Object property is missing a value"))?;
            format_node(&value_node, state)?;

            // Add comma except for last property
            if i < properties.len() - 1 {
                state.push_str(",");
            }
        }
        state.push_newline();
        state.dedent();
    }
    state.push_str("}");
    Ok(())
}

fn format_array(
    arr: &jsonc_parser::cst::CstArray,
    state: &mut FormatterState,
) -> Result<(), JsValue> {
    state.push_str("[");

    let elements = arr.elements();
    if !elements.is_empty() {
        state.indent();
        for (i, element) in elements.iter().enumerate() {
            state.push_newline();
            format_node(element, state)?;

            // Add comma except for last element
            if i < elements.len() - 1 {
                state.push_str(",");
            }
        }
        state.push_newline();
        state.dedent();
    }
    state.push_str("]");
    Ok(())
}

fn format_node(node: &CstNode, state: &mut FormatterState) -> Result<(), JsValue> {
    match node {
        CstNode::Container(container) => {
            match container {
                CstContainerNode::Object(obj) => format_object(obj, state)?,
                CstContainerNode::Array(arr) => format_array(arr, state)?,
                // The other container types are not expected at this level of formatting
                _ => {}
            }
        }
        CstNode::Leaf(leaf) => {
            // Preserve raw spellings for non-string literals.
            match leaf {
                // Skip comments, whitespace, and other tokens that aren't part of the value.
                CstLeafNode::Comment(_)
                | CstLeafNode::Whitespace(_)
                | CstLeafNode::Token(_)
                | CstLeafNode::Newline(_) => {}
                CstLeafNode::StringLit(literal) => {
                    let raw = literal.raw_value();
                    if is_safe_json_string_literal(&raw) {
                        state.push_str(&raw);
                    } else {
                        let decoded = literal
                            .decoded_value()
                            .map_err(|err| js_error(&format!("Invalid string literal: {err}")))?;
                        state.push_str(&encode_json_string(&decoded));
                    }
                }
                // For all other literals, push their raw text.
                _ => state.push_str(&leaf.to_string()),
            }
        }
    }
    Ok(())
}

fn is_safe_json_string_literal(raw: &str) -> bool {
    let mut chars = raw.chars();
    if chars.next() != Some('"') {
        return false;
    }

    while let Some(character) = chars.next() {
        match character {
            '"' => return chars.next().is_none(),
            '\\' => match chars.next() {
                Some('u') => {
                    for _ in 0..4 {
                        if !matches!(chars.next(), Some(c) if c.is_ascii_hexdigit()) {
                            return false;
                        }
                    }
                }
                Some('"' | '\\' | '/' | 'b' | 'f' | 'n' | 'r' | 't') => {}
                _ => return false,
            },
            character if character <= '\u{1f}' => return false,
            _ => {}
        }
    }
    false
}

fn encode_json_string(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len() + 2);
    encoded.push('"');
    for character in value.chars() {
        match character {
            '"' => encoded.push_str("\\\""),
            '\\' => encoded.push_str("\\\\"),
            '\u{08}' => encoded.push_str("\\b"),
            '\u{0c}' => encoded.push_str("\\f"),
            '\n' => encoded.push_str("\\n"),
            '\r' => encoded.push_str("\\r"),
            '\t' => encoded.push_str("\\t"),
            character if character <= '\u{1f}' => {
                encoded.push_str(&format!("\\u{:04x}", character as u32));
            }
            character => encoded.push(character),
        }
    }
    encoded.push('"');
    encoded
}

fn js_error(message: &str) -> JsValue {
    #[cfg(target_arch = "wasm32")]
    {
        JsValue::from_str(message)
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        let _ = message;
        JsValue::NULL
    }
}

#[cfg(test)]
mod tests {
    use super::format_json;

    #[test]
    fn escapes_object_keys_without_changing_their_values() {
        let output =
            format_json(r#"{"quote\"key": 1, "back\\slash": 2, "line\nkey": 3, "עברית😀": 4}"#)
                .unwrap();

        assert!(output.contains(r#""quote\"key": 1"#));
        assert!(output.contains(r#""back\\slash": 2"#));
        assert!(output.contains(r#""line\nkey": 3"#));
        assert!(output.contains(r#""עברית😀": 4"#));
    }

    #[test]
    fn converts_single_quoted_values_and_repairs_missing_commas() {
        assert_eq!(
            format_json("{one: 'value' two: 'next'}").unwrap(),
            "{\n    \"one\": \"value\",\n    \"two\": \"next\"\n}\n"
        );
    }

    #[test]
    fn rejects_invalid_object_properties_without_inventing_a_key() {
        assert!(format_json("{: 1}").is_err());
    }
}
