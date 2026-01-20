#[derive(Debug)]
pub struct SimpleLog {
    entries: Vec<String>,
}

impl SimpleLog {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn add(&mut self, message: impl Into<String>) {
        self.entries.push(message.into());
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn iter(&self) -> std::slice::Iter<'_, String> {
        self.entries.iter()
    }
}

impl IntoIterator for SimpleLog {
    type Item = String;
    type IntoIter = std::vec::IntoIter<Self::Item>;

    fn into_iter(self) -> Self::IntoIter {
        self.entries.into_iter()
    }
}

impl FromIterator<String> for SimpleLog {
    fn from_iter<I: IntoIterator<Item = String>>(iter: I) -> Self {
        let mut log = SimpleLog::new();

        for item in iter {
            log.add(item);
        }

        log
    }
}
