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

// ------------------------------------------------------------------------------------------------ //
/// Run-length encoding iterator for UTF-8 strings
#[derive(Debug)]
pub struct Utf8RunLengthEncode<'a> {
    slice: &'a str,
}

impl<'a> Utf8RunLengthEncode<'a> {
    pub fn new(slice: &'a str) -> Self {
        Utf8RunLengthEncode { slice }
    }
}

impl<'a> Iterator for Utf8RunLengthEncode<'a> {
    type Item = (char, usize);

    fn next(&mut self) -> Option<Self::Item> {
        let first_char = self.slice.chars().next()?;
        let count = self.slice.chars().take_while(|&c| c == first_char).count();

        self.slice = &self.slice[first_char.len_utf8() * count..];

        Some((first_char, count))
    }
}

pub fn run_utf8_length_encode(s: &str) -> Utf8RunLengthEncode<'_> {
    Utf8RunLengthEncode::new(s)
}

// ------------------------------------------------------------------------------------------------ //
/// Run-length encoding iterator for ASCII strings
#[derive(Debug)]
pub struct AsciiRunLengthEncode<'a> {
    current: *const u8,
    end: *const u8,
    _marker: std::marker::PhantomData<&'a str>,
}

impl<'a> AsciiRunLengthEncode<'a> {
    pub fn new(slice: &'a str) -> Self {
        let ptr = slice.as_ptr();
        let len = slice.len();

        AsciiRunLengthEncode {
            current: ptr,
            end: unsafe { ptr.add(len) },
            _marker: std::marker::PhantomData,
        }
    }
}

impl<'a> Iterator for AsciiRunLengthEncode<'a> {
    type Item = (char, usize);

    fn next(&mut self) -> Option<Self::Item> {
        if self.current >= self.end {
            return None;
        }

        let first_byte = unsafe { *self.current };
        let first_char = first_byte as char;
        let mut char_count = 1;

        self.current = unsafe { self.current.add(1) };

        while self.current < self.end {
            let next_byte = unsafe { *self.current };
            if next_byte != first_byte {
                break;
            }
            self.current = unsafe { self.current.add(1) };
            char_count += 1;
        }

        Some((first_char, char_count))
    }
}

pub fn run_ascii_length_encode(s: &str) -> AsciiRunLengthEncode<'_> {
    AsciiRunLengthEncode::new(s)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_run_ascii_length_encode() {
        assert_eq!(
            run_ascii_length_encode("aaaabbbcca").collect::<Vec<_>>(),
            vec![('a', 4), ('b', 3), ('c', 2), ('a', 1)]
        );
    }

    #[test]
    fn test_run_ascii_length_encode_hello() {
        assert_eq!(
            run_ascii_length_encode("hello").collect::<Vec<_>>(),
            vec![('h', 1), ('e', 1), ('l', 2), ('o', 1)]
        );
    }

    #[test]
    fn test_run_ascii_length_encode_empty() {
        assert_eq!(run_ascii_length_encode("").collect::<Vec<_>>(), vec![]);
    }

    #[test]
    fn test_run_utf8_length_encode() {
        assert_eq!(
            run_utf8_length_encode("aaaabbbcca").collect::<Vec<_>>(),
            vec![('a', 4), ('b', 3), ('c', 2), ('a', 1)]
        );
    }

    #[test]
    fn test_run_utf8_length_encode_hello() {
        assert_eq!(
            run_utf8_length_encode("hello").collect::<Vec<_>>(),
            vec![('h', 1), ('e', 1), ('l', 2), ('o', 1)]
        );
    }

    #[test]
    fn test_run_utf8_length_encode_empty() {
        assert_eq!(run_utf8_length_encode("").collect::<Vec<_>>(), vec![]);
    }

    #[test]
    fn test_run_utf8_length_encode_non_ascii() {
        assert_eq!(
            run_utf8_length_encode("привет").collect::<Vec<_>>(),
            vec![('п', 1), ('р', 1), ('и', 1), ('в', 1), ('е', 1), ('т', 1)]
        );
    }
}
