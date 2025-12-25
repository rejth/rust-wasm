use super::core::{Serializable, SerializeError, Serializer};
use std::fmt::Write;

/// Serializes a data to JSON representation.
///
/// # Arguments
/// * `data` - The data to serialize.
///
/// # Returns
/// The JSON string representation of the data. If the data is not serializable, returns `None` and prints the error to stderr.
pub fn to_json<T: Serializable>(data: &T) -> Option<String> {
    let mut serializer = JsonSerializer::new();

    match data.serialize(&mut serializer) {
        Ok(()) => serializer.finish().ok(),
        Err(e) => {
            eprintln!("Error serializing to JSON: {}", e);
            None
        }
    }
}

/// A serializer for JSON representation.
///
/// # Fields
/// * `output` - The output string.
/// * `field_index` - The index of the current field.
/// * `array_index` - The index of the current array element.
struct JsonSerializer {
    output: String,
    field_index: usize,
    array_index: usize,
}

impl JsonSerializer {
    pub fn new() -> Self {
        Self {
            output: String::new(),
            field_index: 0,
            array_index: 0,
        }
    }
}

impl Serializer for JsonSerializer {
    fn serialize_i32(&mut self, value: i32) -> Result<(), SerializeError> {
        write!(self.output, "{}", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_u32(&mut self, value: u32) -> Result<(), SerializeError> {
        write!(self.output, "{}", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_str(&mut self, value: &str) -> Result<(), SerializeError> {
        return write!(self.output, "\"{}\"", escape_json_str(value))
            .map_err(|e| SerializeError(e.to_string()));

        fn escape_json_str(str: &str) -> String {
            let mut escaped = String::with_capacity(str.len());

            for char in str.chars() {
                match char {
                    '"' => escaped.push_str("\\\""),
                    '\\' => escaped.push_str("\\\\"),
                    '\n' => escaped.push_str("\\n"),
                    '\r' => escaped.push_str("\\r"),
                    '\t' => escaped.push_str("\\t"),
                    char if char.is_control() => write!(escaped, "\\u{:04x}", char as u32).unwrap(),
                    char => escaped.push(char),
                }
            }

            escaped
        }
    }

    fn serialize_bool(&mut self, value: bool) -> Result<(), SerializeError> {
        write!(self.output, "{}", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_struct_start(&mut self, _name: &str) -> Result<(), SerializeError> {
        self.field_index = 0;
        self.output.push('{');
        Ok(())
    }

    fn serialize_field<T: Serializable>(
        &mut self,
        name: &str,
        value: &T,
    ) -> Result<(), SerializeError> {
        if self.field_index > 0 {
            self.output.push(',');
        }

        write!(self.output, "\"{}\":", name).map_err(|e| SerializeError(e.to_string()))?;
        value.serialize(self)?;
        self.field_index += 1;

        Ok(())
    }

    fn serialize_struct_end(&mut self) -> Result<(), SerializeError> {
        self.output.push('}');
        Ok(())
    }

    fn serialize_array_start(&mut self, _len: usize) -> Result<(), SerializeError> {
        self.array_index = 0;
        self.output.push('[');
        Ok(())
    }

    fn serialize_array_element<T: Serializable>(
        &mut self,
        value: &T,
    ) -> Result<(), SerializeError> {
        if self.array_index > 0 {
            self.output.push(',');
        }

        value.serialize(self)?;
        self.array_index += 1;

        Ok(())
    }

    fn serialize_array_end(&mut self) -> Result<(), SerializeError> {
        self.output.push(']');
        Ok(())
    }

    fn finish(self) -> Result<String, SerializeError> {
        Ok(self.output)
    }
}

#[cfg(test)]
mod tests {
    use crate::serializer::{
        Person, SerializeError,
        core::{Serializable, Serializer},
        to_json,
    };

    #[test]
    fn test_json_primitives() {
        assert_eq!(to_json(&42i32), Some("42".to_string()));
        assert_eq!(to_json(&100u32), Some("100".to_string()));
        assert_eq!(to_json(&true), Some("true".to_string()));
        assert_eq!(to_json(&false), Some("false".to_string()));
        assert_eq!(to_json(&"hello".to_string()), Some("\"hello\"".to_string()));
    }

    #[test]
    fn test_json_array() {
        let arr = [1i32, 2, 3];
        assert_eq!(to_json(&arr), Some("[1,2,3]".to_string()));
    }

    #[test]
    fn test_json_vec() {
        let vec = vec![1i32, 2, 3];
        assert_eq!(to_json(&vec), Some("[1,2,3]".to_string()));
    }

    #[test]
    fn test_json_tuple() {
        let tuple = (42i32, "hello".to_string());
        assert_eq!(to_json(&tuple), Some("[42,\"hello\"]".to_string()));
    }

    #[test]
    fn test_json_struct() {
        let person = Person {
            name: "John".to_string(),
            age: 30,
            active: true,
        };

        let result = to_json(&person).unwrap();

        assert_eq!(result, "{\"name\":\"John\",\"age\":30,\"active\":true}");
    }

    #[test]
    fn test_json_nested_struct() {
        struct Address {
            city: String,
            street: String,
        }

        impl Serializable for Address {
            fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
                serializer.serialize_struct_start("Address")?;
                serializer.serialize_field("city", &self.city)?;
                serializer.serialize_field("street", &self.street)?;
                serializer.serialize_struct_end()
            }
        }

        struct Person {
            name: String,
            age: u32,
            active: bool,
            address: Address,
            score: Score,
        }

        impl Serializable for Person {
            fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
                serializer.serialize_struct_start("Person")?;
                serializer.serialize_field("name", &self.name)?;
                serializer.serialize_field("age", &self.age)?;
                serializer.serialize_field("active", &self.active)?;
                serializer.serialize_field("address", &self.address)?;
                serializer.serialize_field("score", &self.score)?;
                serializer.serialize_struct_end()
            }
        }

        struct Score {
            value: u32,
            date: String,
        }

        impl Serializable for Score {
            fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
                serializer.serialize_struct_start("Score")?;
                serializer.serialize_field("value", &self.value)?;
                serializer.serialize_field("date", &self.date)?;
                serializer.serialize_struct_end()
            }
        }

        let person = Person {
            name: "John".to_string(),
            age: 30,
            active: true,
            address: Address {
                city: "New York".to_string(),
                street: "Main St".to_string(),
            },
            score: Score {
                value: 100,
                date: "2025-01-01".to_string(),
            },
        };

        let result = to_json(&person).unwrap();

        assert_eq!(
            result,
            "{\"name\":\"John\",\"age\":30,\"active\":true,\"address\":{\"city\":\"New York\",\"street\":\"Main St\"},\"score\":{\"value\":100,\"date\":\"2025-01-01\"}}"
        );
    }
}
