use super::types::DataType;

#[derive(Debug, PartialEq)]
pub struct Schema {
    pub(crate) columns: Vec<(String, DataType)>,
}

impl Schema {
    pub fn new(columns: Vec<(String, DataType)>) -> Self {
        Self { columns }
    }

    /// Parse schema from CSV headers.
    ///
    /// # Arguments
    /// * `headers` - CSV headers to parse schema from
    ///
    /// # Returns
    /// A new schema parsed from the CSV headers.
    ///
    /// # Panics
    /// Panics if the CSV headers are invalid.
    pub(crate) fn parse_schema(headers: &str) -> Self {
        let mut columns = vec![];

        for column in headers.split(",") {
            let mut name = "";

            for (i, value) in column.split(":").enumerate() {
                match i {
                    0 => name = value,
                    _ => columns.push((
                        name.to_string(),
                        match value {
                            "Integer" => DataType::Integer,
                            "Float" => DataType::Float,
                            "Text" => DataType::Text,
                            "Boolean" => DataType::Boolean,
                            _ => unreachable!(),
                        },
                    )),
                }
            }
        }

        Self { columns }
    }
}
