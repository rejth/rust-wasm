use super::core::{Serializable, SerializeError, Serializer};

// ========================
// Make primitive types serializable
// ========================
impl Serializable for i32 {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_i32(*self)
    }
}

impl Serializable for u32 {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_u32(*self)
    }
}

impl Serializable for String {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_str(self)
    }
}

impl Serializable for &str {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_str(self)
    }
}

impl Serializable for bool {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_bool(*self)
    }
}

// ========================
// Make a fixed-size array [T; N] serializable
// ========================
impl<T: Serializable, const N: usize> Serializable for [T; N] {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_array_start(N)?;

        for item in self {
            serializer.serialize_array_element(item)?;
        }

        serializer.serialize_array_end()
    }
}

// ========================
// Make a Vec<T> serializable
// ========================
impl<T: Serializable> Serializable for Vec<T> {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_array_start(self.len())?;

        for item in self {
            serializer.serialize_array_element(item)?;
        }

        serializer.serialize_array_end()
    }
}

// ========================
// Make a (A, B) tuple serializable
// ========================
impl<A: Serializable, B: Serializable> Serializable for (A, B) {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_array_start(2)?;
        serializer.serialize_array_element(&self.0)?;
        serializer.serialize_array_element(&self.1)?;
        serializer.serialize_array_end()
    }
}

// ========================
// Make a custom `Person` struct serializable
// ========================
#[derive(Debug)]
pub struct Person {
    pub name: String,
    pub age: u32,
    pub active: bool,
}

impl Serializable for Person {
    fn serialize<S: Serializer>(&self, serializer: &mut S) -> Result<(), SerializeError> {
        serializer.serialize_struct_start("Person")?;
        serializer.serialize_field("name", &self.name)?;
        serializer.serialize_field("age", &self.age)?;
        serializer.serialize_field("active", &self.active)?;
        serializer.serialize_struct_end()
    }
}
