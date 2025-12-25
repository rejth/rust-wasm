use std::ops::{Deref, DerefMut};
use std::{error::Error, fmt};

/// Owned ASCII string (bytes 0-127)
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
pub struct AsciiString(String);

impl AsciiString {
    // Create a new ASCII string from a string slice with panic if non-ASCII characters are present
    pub fn new(data: impl AsRef<str>) -> Self {
        let str = data.as_ref().try_into();

        match str {
            Ok(str) => str,
            Err(err) => panic!("{}", err),
        }
    }

    // Create a new ASCII string from a byte slice with panic if non-ASCII characters are present
    pub fn from_bytes(bytes: impl AsRef<[u8]>) -> Self {
        let str = bytes.as_ref().try_into();

        match str {
            Ok(str) => str,
            Err(err) => panic!("{}", err),
        }
    }

    pub fn len(&self) -> usize {
        self.0.len()
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    pub fn contains(&self, needle: &str) -> bool {
        self.0.contains(needle)
    }

    pub fn to_ascii_uppercase(&self) -> Self {
        Self(self.0.to_ascii_uppercase())
    }

    pub fn to_ascii_lowercase(&self) -> Self {
        Self(self.0.to_ascii_lowercase())
    }

    pub fn as_bytes(&self) -> &[u8] {
        self.0.as_bytes()
    }
}

// Convert from a borrowed string slice to the owned `AsciiString`.
impl TryFrom<&str> for AsciiString {
    type Error = AsciiError;

    fn try_from(data: &str) -> Result<Self, Self::Error> {
        if data.is_ascii() {
            Ok(Self(data.to_owned()))
        } else {
            let (pos, char) = data.char_indices().find(|&(_, c)| !c.is_ascii()).unwrap();

            Err(AsciiError::with_cause(
                format!(
                    "Non-ASCII character '{}' (U+{:04X}) at byte position {}",
                    char, char as u32, pos
                ),
                AsciiError::new("Non-ASCII character found"),
            ))
        }
    }
}

// Convert from a borrowed byte slice to the owned `AsciiString`.
impl TryFrom<&[u8]> for AsciiString {
    type Error = AsciiError;

    fn try_from(bytes: &[u8]) -> Result<Self, Self::Error> {
        String::from_utf8_lossy(bytes).as_ref().try_into()
    }
}

// Convert from a borrowed fixed-size array of bytes to an `AsciiString`.
impl<const N: usize> From<&'static [u8; N]> for AsciiString {
    fn from(bytes: &'static [u8; N]) -> Self {
        Self(String::from_utf8_lossy(bytes).to_string())
    }
}

// Return `AsciiString` as a string slice
impl AsRef<str> for AsciiString {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

// Return `AsciiString` as a byte slice
impl AsRef<[u8]> for AsciiString {
    fn as_ref(&self) -> &[u8] {
        self.0.as_bytes()
    }
}

// Return `AsciiString` as a mutable reference to a string
impl AsMut<String> for AsciiString {
    fn as_mut(&mut self) -> &mut String {
        &mut self.0
    }
}

impl Deref for AsciiString {
    type Target = str;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for AsciiString {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl fmt::Debug for AsciiString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "AsciiString({:?})", self.0)
    }
}

impl fmt::Display for AsciiString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Error when creating AsciiString from invalid data
#[derive(Debug)]
pub struct AsciiError {
    msg: String,
    cause: Option<Box<dyn Error + 'static>>,
}

impl AsciiError {
    fn new(msg: impl Into<String>) -> Self {
        Self {
            msg: msg.into(),
            cause: None,
        }
    }

    fn with_cause(msg: impl Into<String>, cause: impl Error + 'static) -> Self {
        Self {
            msg: msg.into(),
            cause: Some(Box::new(cause)),
        }
    }
}

impl fmt::Display for AsciiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.msg)
    }
}

impl Error for AsciiError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        self.cause.as_ref().map(|e| &**e as _)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const ASCII_LIT: &str = "ASCII";
    const ASCII_BYTES: &[u8; 5] = b"ASCII";

    #[test]
    fn try_from_str_success() {
        let ascii = AsciiString::try_from(ASCII_LIT).unwrap();
        assert_eq!(&*ascii, ASCII_LIT);
    }

    #[test]
    fn try_from_str_failure() {
        let err = AsciiString::try_from("hi ☃ there").unwrap_err();
        let message = err.to_string();

        assert!(message.contains("Non-ASCII character"), "{}", message);
        assert!(err.source().is_some());
    }

    #[test]
    fn try_from_bytes_success() {
        let ascii = AsciiString::try_from(b"hello").unwrap();
        assert_eq!(&*ascii, "hello");
    }

    #[test]
    fn from_bytes_literal_success() {
        let ascii: AsciiString = ASCII_BYTES.into();
        assert_eq!(&*ascii, ASCII_LIT);
    }

    #[test]
    fn try_from_bytes_failure() {
        let err = AsciiString::try_from(&[0xFF, 0xFF][..]).unwrap_err();
        assert!(err.to_string().contains("Non-ASCII character"));
    }

    #[test]
    fn from_static_bytes_literal() {
        let ascii = AsciiString::from(ASCII_BYTES);
        assert_eq!(&*ascii, "ASCII");
    }

    #[test]
    fn should_panic_on_non_ascii_input() {
        let err = std::panic::catch_unwind(|| AsciiString::new("☃"));
        assert!(err.is_err());
    }

    #[test]
    fn from_bytes_panics_on_invalid_data() {
        let err = std::panic::catch_unwind(|| AsciiString::from_bytes(&[0xFF]));
        assert!(err.is_err());
    }

    #[test]
    fn as_ref_and_as_bytes_agree() {
        let ascii = AsciiString::new("bytes");

        assert_eq!(<AsciiString as AsRef<str>>::as_ref(&ascii), "bytes");
        assert_eq!(ascii.as_bytes(), b"bytes");
    }

    #[test]
    fn should_allow_mutation() {
        let mut ascii = AsciiString::new("mut");
        ascii.as_mut().push('!');

        assert_eq!(&*ascii, "mut!");
    }

    #[test]
    fn should_display() {
        let ascii = AsciiString::new("fmt");
        assert_eq!(format!("{}", ascii), "fmt");
    }

    #[test]
    fn should_debug() {
        let ascii = AsciiString::new("debug");
        assert!(format!("{:?}", ascii).contains("AsciiString(\"debug\")"));
    }

    #[test]
    fn should_convert_to_case_variants() {
        let ascii = AsciiString::new("Rust");

        assert_eq!(
            <AsciiString as AsRef<str>>::as_ref(&ascii.to_ascii_lowercase()),
            "rust"
        );
        assert_eq!(
            <AsciiString as AsRef<str>>::as_ref(&ascii.to_ascii_uppercase()),
            "RUST"
        );
    }
}
