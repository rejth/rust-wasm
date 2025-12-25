#[derive(Debug, PartialEq)]
pub struct SerializeError(pub String);

impl std::fmt::Display for SerializeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// A trait for types that can be serialized to a string.
pub trait Serializable {
    /// Serialize the type to a string.
    ///
    /// # Arguments
    /// * `serializer` - The serializer to use.
    ///
    /// # Returns
    /// A result indicating success or failure.
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError>;
}

/// A trait for various serializers that can be used to serialize different types to a string.
///
/// # Arguments
/// * `serializer` - The serializer to use.
///
/// # Returns
/// A result indicating success or failure. If the serialization fails, returns a `SerializeError`.
pub trait Serializer {
    // ========================
    // Serialize primitive types
    // ========================
    fn serialize_i32(&mut self, value: i32) -> Result<(), SerializeError>;

    fn serialize_u32(&mut self, value: u32) -> Result<(), SerializeError>;

    fn serialize_str(&mut self, value: &str) -> Result<(), SerializeError>;

    fn serialize_bool(&mut self, value: bool) -> Result<(), SerializeError>;

    // ========================
    // Serialize structs
    // ========================
    fn serialize_struct_start(&mut self, name: &str) -> Result<(), SerializeError>;

    fn serialize_field<T: Serializable>(
        &mut self,
        name: &str,
        value: &T,
    ) -> Result<(), SerializeError>;

    fn serialize_struct_end(&mut self) -> Result<(), SerializeError>;

    // ========================
    // Serialize arrays
    // ========================
    fn serialize_array_start(&mut self, len: usize) -> Result<(), SerializeError>;

    fn serialize_array_element<T: Serializable>(&mut self, value: &T)
    -> Result<(), SerializeError>;

    fn serialize_array_end(&mut self) -> Result<(), SerializeError>;

    // ========================
    // Finish serialization
    // ========================
    fn finish(self) -> Result<String, SerializeError>;
}
