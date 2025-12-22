#[allow(dead_code)]
struct User<T>(T);

#[allow(dead_code)]
impl<T> User<T> {
    fn simple_hello(&self) {
        println!("Hello");
    }
}

#[allow(dead_code)]
impl User<&str> {
    fn hello(&self) {
        println!("Hello user, {}", self.0);
    }
}

#[allow(dead_code)]
impl User<i32> {
    fn hello(&self) {
        println!("Hello, android {}", self.0);
    }
}

// ------------------------------------------------------------
#[allow(dead_code)]
trait Answerable<T: Copy> {
    fn answer(&self) -> T;
}

#[allow(dead_code)]
struct User3<T> {
    value: T,
}

impl<T: Copy> Answerable<T> for User3<T> {
    fn answer(&self) -> T {
        self.value
    }
}

impl<T: Copy, B> Answerable<T> for (T, B) {
    fn answer(&self) -> T {
        self.0
    }
}

//-----------------------------------------------------------
#[allow(dead_code)]
trait ConvertFrom<T> {
    fn convert_from(value: T) -> Self;
}

#[allow(dead_code)]
#[derive(Debug, PartialEq, Copy, Clone)]
struct RGB(u8, u8, u8);

#[derive(Debug, PartialEq, Copy, Clone)]
struct RGBA(u8, u8, u8, u8);

impl ConvertFrom<RGB> for RGBA {
    fn convert_from(value: RGB) -> Self {
        RGBA(value.0, value.1, value.2, 100)
    }
}

impl ConvertFrom<RGBA> for RGB {
    fn convert_from(value: RGBA) -> Self {
        RGB(value.0, value.1, value.2)
    }
}

// ------------------------------------------------------------
// ASSOCIATED TYPES
//
// Associated Types allow you to associate a type with a trait.
// It's like a "placeholder" for a type that will be defined during implementation.
//
// Key points:
// 1. `type Item;` - declaration of an associated type (not yet defined)
// 2. `Self::Item` - reference to the concrete type defined in the implementation
// 3. `type Item = u32;` - definition of a concrete type during implementation
//
// Why is this useful?
// - A type can implement a trait only once (with one Item type)
// - The element type is fixed for a specific implementation
// - No need to specify the type every time when using
#[allow(dead_code)]
trait Iterator {
    type Item; // ← "Each iterator has an element type, but we don't know which one yet"

    fn next(&mut self) -> Option<Self::Item>; // ← Self::Item = concrete type from implementation
}

#[allow(dead_code)]
struct Counter {
    count: u32,
}

impl Iterator for Counter {
    type Item = u32; // ← Define: for Counter, elements have type u32

    fn next(&mut self) -> Option<Self::Item> {
        // ← Option<u32>
        let current = self.count;
        self.count += 1;
        Some(current) // ← Return Some(u32)
    }
}

// Example: another iterator with a different element type
#[allow(dead_code)]
struct StringIterator {
    strings: Vec<String>,
    index: usize,
}

impl Iterator for StringIterator {
    type Item = String; // ← For StringIterator, elements have type String

    fn next(&mut self) -> Option<Self::Item> {
        // ← Option<String>
        if self.index < self.strings.len() {
            let result = self.strings[self.index].clone();
            self.index += 1;
            Some(result) // ← Return Some(String)
        } else {
            None
        }
    }
}

//-----------------------------------------------------------
// ASSOCIATED CONSTANTS
// Similar to an associated type, allows you to bind a constant to a trait
// These constants can also be used in default implementations
// Unlike an associated type, they may have a default value
#[allow(dead_code)]
trait Greeting {
    const GREETING: &'static str = "Hello";

    fn greet(&self, name: &str) -> String {
        format!("{}, {}!", Self::GREETING, name)
    }
}

#[allow(dead_code)]
struct English;

#[allow(dead_code)]
struct Russian;

impl Greeting for English {}

impl Greeting for Russian {
    const GREETING: &'static str = "Привет";
}

// -------------------------TESTS-----------------------------------
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user() {
        let user = User(10);
        user.simple_hello(); // Hello
        user.hello(); // Hello, android 10
    }

    #[test]
    fn test_user_str() {
        let user = User("Bob");
        user.simple_hello(); // Hello
        user.hello(); // Hello, user 10
    }

    #[test]
    fn test_user3() {
        assert_eq!(User3 { value: "bob" }.answer(), "bob");
        assert_eq!((1, 2).answer(), 1);
    }

    #[test]
    fn test_convert_from() {
        let a = RGBA::convert_from(RGB(255, 255, 255));
        let b = RGB::convert_from(a);
        assert_eq!(a, RGBA(255, 255, 255, 100));
        assert_eq!(b, RGB(255, 255, 255));
    }

    #[test]
    fn test_counter() {
        let mut counter = Counter { count: 0 };
        assert_eq!(counter.next(), Some(0));
        assert_eq!(counter.next(), Some(1));
        assert_eq!(counter.next(), Some(2));
    }

    #[test]
    fn test_greeting() {
        let eng = English;
        let rus = Russian;
        assert_eq!(eng.greet("Alice"), "Hello, Alice!");
        assert_eq!(rus.greet("Алиса"), "Привет, Алиса!");
    }
}
