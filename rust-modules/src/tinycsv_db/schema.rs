use super::types::DataType;

pub struct Schema {
    pub(crate) columns: Vec<(String, DataType)>,
}

impl Schema {
    pub fn new(columns: Vec<(String, DataType)>) -> Self {
        Schema { columns }
    }
}
