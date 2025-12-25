use super::core::{Serializable, SerializeError, Serializer};
use std::fmt::Write;

/// Serializes a data to debug representation.
///
/// # Arguments
/// * `data` - The data to serialize.
///
/// # Returns
/// The debug string representation of the data. If the data is not serializable, returns `None` and prints the error to stderr.
pub fn to_debug<T: Serializable>(data: &T) -> Option<String> {
    let mut serializer = DebugSerializer::new();

    match data.serialize(&mut serializer) {
        Ok(()) => serializer.finish().ok(),
        Err(e) => {
            eprintln!("Error serializing to debug: {}", e);
            None
        }
    }
}

/// A serializer for debug representation.
///
/// # Fields
/// * `output` - The output string.
/// * `field_index` - The index of the current field.
/// * `array_index` - The index of the current array element.
struct DebugSerializer {
    output: String,
    field_index: usize,
    array_index: usize,
}

impl DebugSerializer {
    pub fn new() -> Self {
        Self {
            output: String::new(),
            field_index: 0,
            array_index: 0,
        }
    }
}

impl Serializer for DebugSerializer {
    fn serialize_i32(&mut self, value: i32) -> Result<(), SerializeError> {
        write!(self.output, "{}", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_u32(&mut self, value: u32) -> Result<(), SerializeError> {
        write!(self.output, "{}", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_str(&mut self, value: &str) -> Result<(), SerializeError> {
        write!(self.output, "\"{}\"", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_bool(&mut self, value: bool) -> Result<(), SerializeError> {
        write!(self.output, "{}", value).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_struct_start(&mut self, name: &str) -> Result<(), SerializeError> {
        self.field_index = 0;
        write!(self.output, "{} {{ ", name).map_err(|e| SerializeError(e.to_string()))
    }

    fn serialize_field<T: Serializable>(
        &mut self,
        name: &str,
        value: &T,
    ) -> Result<(), SerializeError> {
        if self.field_index > 0 {
            self.output.push_str(", ");
        }

        write!(self.output, "{}: ", name).map_err(|e| SerializeError(e.to_string()))?;
        value.serialize(self)?;
        self.field_index += 1;

        Ok(())
    }

    fn serialize_struct_end(&mut self) -> Result<(), SerializeError> {
        self.output.push_str(" }");
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
            self.output.push_str(", ");
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
    use crate::serializer::{Person, Serializable, SerializeError, Serializer, to_debug};

    #[test]
    fn test_debug_primitives() {
        assert_eq!(to_debug(&42i32), Some("42".to_string()));
        assert_eq!(to_debug(&100u32), Some("100".to_string()));
        assert_eq!(to_debug(&true), Some("true".to_string()));
        assert_eq!(to_debug(&false), Some("false".to_string()));
        assert_eq!(
            to_debug(&"hello".to_string()),
            Some("\"hello\"".to_string())
        );
    }

    #[test]
    fn test_debug_array() {
        let arr = [1i32, 2, 3];
        assert_eq!(to_debug(&arr), Some("[1, 2, 3]".to_string()));
    }

    #[test]
    fn test_debug_vec() {
        let vec = vec![1i32, 2, 3];
        assert_eq!(to_debug(&vec), Some("[1, 2, 3]".to_string()));
    }

    #[test]
    fn test_debug_tuple() {
        let tuple = (42i32, "hello".to_string());
        assert_eq!(to_debug(&tuple), Some("[42, \"hello\"]".to_string()));
    }

    #[test]
    fn test_debug_struct() {
        let person = Person {
            name: "John".to_string(),
            age: 30,
            active: true,
        };

        let result = to_debug(&person).unwrap();

        assert_eq!(result, "Person { name: \"John\", age: 30, active: true }");
    }

    #[test]
    fn test_debug_nested_struct() {
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

        let result = to_debug(&person).unwrap();

        assert_eq!(
            result,
            "Person { name: \"John\", age: 30, active: true, address: Address { city: \"New York\", street: \"Main St\" }, score: Score { value: 100, date: \"2025-01-01\" } }"
        );
    }
}
