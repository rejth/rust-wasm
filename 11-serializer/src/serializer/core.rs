#[derive(Debug, Clone, PartialEq)]
pub struct SerializeError(pub String);

impl std::fmt::Display for SerializeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

pub trait Serializable {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError>;
}

pub trait Serializer {
    fn serialize_i32(&mut self, value: i32) -> Result<(), SerializeError>;

    fn serialize_u32(&mut self, value: u32) -> Result<(), SerializeError>;

    fn serialize_str(&mut self, value: &str) -> Result<(), SerializeError>;

    fn serialize_bool(&mut self, value: bool) -> Result<(), SerializeError>;

    fn serialize_struct_start(&mut self, name: &str) -> Result<(), SerializeError>;

    fn serialize_field<T: Serializable>(
        &mut self,
        name: &str,
        value: &T,
    ) -> Result<(), SerializeError>;

    fn serialize_struct_end(&mut self) -> Result<(), SerializeError>;

    fn serialize_array_start(&mut self, len: usize) -> Result<(), SerializeError>;

    fn serialize_array_element<T: Serializable>(&mut self, value: &T)
    -> Result<(), SerializeError>;

    fn serialize_array_end(&mut self) -> Result<(), SerializeError>;

    fn finish(self) -> Result<String, SerializeError>;
}
