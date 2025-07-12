use wasm_bindgen::prelude::*;
use jsonc_parser::cst::{CstRootNode, CstNode, CstContainerNode, CstLeafNode};
use jsonc_parser::ParseOptions;

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
            self.output.push_str(&self.indent_str.repeat(self.indent_level));
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
        .map_err(|err| JsValue::from_str(&format!("Parse Error: {}", err)))?;

    // The FormatterState now initializes its own output string.
    let mut state = FormatterState {
        output: String::with_capacity(input.len() * 2),
        indent_level: 0,
        indent_str: "    ",
        is_on_new_line: false,
    };

    // Use the high-level API to get and format the root value
    if let Some(obj) = root_node.object_value() {
        format_object(&obj, &mut state);
    } else if let Some(arr) = root_node.array_value() {
        format_array(&arr, &mut state);
    } else {
        // For primitive values, just convert to string
        state.push_str(&root_node.to_string());
    }
    
    // Move the formatted string out of the state to be returned.
    let mut output = state.output;

    // Ensure the final output has a trailing newline
    if !output.is_empty() && !output.ends_with('\n') {
       output.push('\n');
    }

    Ok(output)
}

// The helper functions now operate on the state struct that owns the string.
// Their signatures do not need to change.
fn format_object(obj: &jsonc_parser::cst::CstObject, state: &mut FormatterState) {
    state.push_str("{");
    
    let properties = obj.properties();
    if !properties.is_empty() {
        state.indent();
        for (i, prop) in properties.iter().enumerate() {
            state.push_newline();
            
            // Format key
            if let Some(name) = prop.name() {
                // `ObjectPropName` doesn't implement `Display`. We need to decode its value
                // and then re-format it as a valid JSON string key. This handles both
                // quoted and unquoted keys from the source.
                let key_value = match name.decoded_value() {
                    Ok(decoded) => decoded,
                    // If decoding fails, we'll use a placeholder.
                    Err(_) => "unknown_key".to_string(),
                };
                state.push_str(&format!("\"{}\"", key_value));
            }
            state.push_str(": ");
            
            // Format value
            if let Some(value_node) = prop.value() {
                format_node(&value_node, state);
            }
            
            // Add comma except for last property
            if i < properties.len() - 1 {
                state.push_str(",");
            }
        }
        state.push_newline();
        state.dedent();
    }
    state.push_str("}");
}

fn format_array(arr: &jsonc_parser::cst::CstArray, state: &mut FormatterState) {
    state.push_str("[");
    
    let elements = arr.elements();
    if !elements.is_empty() {
        state.indent();
        for (i, element) in elements.iter().enumerate() {
            state.push_newline();
            format_node(&element, state);
            
            // Add comma except for last element
            if i < elements.len() - 1 {
                state.push_str(",");
            }
        }
        state.push_newline();
        state.dedent();
    }
    state.push_str("]");
}

fn format_node(node: &CstNode, state: &mut FormatterState) {
    match node {
        CstNode::Container(container) => {
            match container {
                CstContainerNode::Object(obj) => format_object(obj, state),
                CstContainerNode::Array(arr) => format_array(arr, state),
                // The other container types are not expected at this level of formatting
                _ => {} 
            }
        }
        CstNode::Leaf(leaf) => {
            // For leaf nodes, we can just use their text representation directly.
            // This preserves the original number and string formatting.
            match leaf {
                // Skip comments, whitespace, and other tokens that aren't part of the value.
                CstLeafNode::Comment(_) | 
                CstLeafNode::Whitespace(_) | 
                CstLeafNode::Token(_) | 
                CstLeafNode::Newline(_) => {}
                // For all other literals, push their raw text.
                _ => state.push_str(&leaf.to_string()),
            }
        }
    }
}
