use wasm_bindgen::prelude::*;
use jsonc_parser::cst::{CstRootNode, CstNode, CstContainerNode, CstLeafNode};
use jsonc_parser::ParseOptions;

// A struct to hold the state of the formatting process.
struct FormatterState<'a> {
    output: &'a mut String,
    indent_level: usize,
    indent_str: &'static str,
    is_on_new_line: bool,
}

impl<'a> FormatterState<'a> {
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

    let mut output = String::with_capacity(input.len() * 2);
    let mut state = FormatterState {
        output: &mut output,
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
    
    // Ensure the final output has a trailing newline
    if !output.is_empty() && !output.ends_with('\n') {
       output.push('\n');
    }

    Ok(output)
}

fn format_object(obj: &jsonc_parser::cst::CstObject, state: &mut FormatterState) {
    state.push_str("{");
    
    // properties() returns Vec<CstObjectProp>, not an iterator
    let properties = obj.properties();
    if !properties.is_empty() {
        state.indent();
        for (i, prop) in properties.iter().enumerate() {
            state.push_newline();
            
            // Format key - handle ObjectPropName properly
            if let Some(name) = prop.name() {
                let name_str = match name.decoded_value() {
                    Ok(decoded) => decoded,
                    Err(_) => "unknown".to_string(), // fallback to a default string
                };
                state.push_str(&format!("\"{}\"", name_str));
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
    
    // elements() returns Vec<CstNode>, not an iterator
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
                CstContainerNode::ObjectProp(prop) => {
                    // This shouldn't happen in our context, but handle it
                    if let Some(name) = prop.name() {
                        let name_str = match name.decoded_value() {
                            Ok(decoded) => decoded,
                            Err(_) => "unknown".to_string(), // fallback to a default string
                        };
                        state.push_str(&format!("\"{}\"", name_str));
                    }
                    state.push_str(": ");
                    if let Some(value) = prop.value() {
                        format_node(&value, state);
                    }
                }
                CstContainerNode::Root(root) => {
                    // Handle root node - this shouldn't happen in our recursion but we need to cover it
                    if let Some(obj) = root.object_value() {
                        format_object(&obj, state);
                    } else if let Some(arr) = root.array_value() {
                        format_array(&arr, state);
                    } else {
                        state.push_str(&root.to_string());
                    }
                }
            }
        }
        CstNode::Leaf(leaf) => {
            match leaf {
                CstLeafNode::BooleanLit(b) => {
                    state.push_str(if b.value() { "true" } else { "false" });
                }
                CstLeafNode::NullKeyword(_) => {
                    state.push_str("null");
                }
                CstLeafNode::NumberLit(n) => {
                    // Use the text representation instead of trying to parse
                    state.push_str(&n.to_string());
                }
                CstLeafNode::StringLit(s) => {
                    // Handle the Result from decoded_value()
                    let decoded = match s.decoded_value() {
                        Ok(value) => value,
                        Err(_) => s.to_string(), // fallback to raw string
                    };
                    state.push_str(&format!("\"{}\"", decoded));
                }
                CstLeafNode::WordLit(w) => {
                    // Handle unquoted properties - use to_string() as fallback
                    state.push_str(&format!("\"{}\"", w.to_string()));
                }
                // Skip comments, whitespace, and tokens in formatting
                CstLeafNode::Comment(_) | 
                CstLeafNode::Whitespace(_) | 
                CstLeafNode::Token(_) | 
                CstLeafNode::Newline(_) => {}
            }
        }
    }
}
