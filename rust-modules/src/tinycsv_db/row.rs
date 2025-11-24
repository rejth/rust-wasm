use super::types::Value;

pub struct Row {
    pub(super) values: Vec<Value>,
}

impl Row {
    pub fn new(values: Vec<Value>) -> Self {
        Row { values }
    }

    pub fn get_values(&self) -> &Vec<Value> {
        &self.values
    }

    pub fn get_value(&self, index: usize) -> Option<&Value> {
        self.values.get(index)
    }
}
