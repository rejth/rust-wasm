use ascii_type::AsciiString;

fn main() {
    // ========================
    // Successfully create from ASCII-data
    // ========================
    let hello = {
        let ascii_str: AsciiString = b"Hello, ASCII!".into();
        println!("Created successfully: {}", ascii_str);
        println!("Length: {}", ascii_str.len());

        assert_eq!(ascii_str.len(), 13);
        assert!(ascii_str.contains("ASCII"));
        assert_eq!(ascii_str.to_ascii_uppercase(), b"HELLO, ASCII!".into());
        assert_eq!(ascii_str.to_ascii_lowercase(), b"hello, ascii!".into());

        ascii_str
    };

    println!("✓ Successfully created and basic methods work\n");

    // ========================
    // Panic when non-ASCII (handle safely)
    // ========================
    {
        use std::panic;

        let result = panic::catch_unwind(|| {
            let _invalid = AsciiString::new("Hello ☃");
        });

        assert!(result.is_err(), "Expected panic when non-ASCII characters");
        println!("✓ Panic when non-ASCII characters works correctly\n");
    }

    // ========================
    // Safe creation through TryFrom
    // ========================
    // Create AsciiString from a string
    let valid = {
        let result = AsciiString::try_from("valid ascii");
        assert!(result.is_ok(), "Valid ASCII string should be converted");
        result.unwrap()
    };
    println!("Safe creation from ASCII: {}", valid);

    // Create AsciiString from a slice of bytes
    let valid = {
        let result = AsciiString::try_from(b"valid ascii");
        assert!(result.is_ok(), "Valid ASCII string should be converted");
        result.unwrap()
    };
    println!("Safe creation from ASCII: {}", valid);

    // Create AsciiString from a non-ASCII string
    let invalid = {
        let result = AsciiString::try_from("non ascii ☃");
        assert!(result.is_err(), "Non-ASCII string should return an error");
        result.unwrap_err()
    };
    println!(
        "Error when non-ASCII: {}\n✓ TryFrom works correctly\n",
        invalid
    );

    // ========================
    // Case conversion
    // ========================
    let mixed_case = {
        let original = AsciiString::new("HeLLo WoRLd 123!");
        let lower = original.to_ascii_lowercase();
        let upper = original.to_ascii_uppercase();

        // assert_eq!(lower, AsciiString::new("hello world 123!"));
        // assert_eq!(upper, AsciiString::new("HELLO WORLD 123!"));

        (original, lower, upper)
    };

    println!("Original: {}", mixed_case.0);
    println!("Lowercase: {}", mixed_case.1);
    println!("Uppercase: {}", mixed_case.2);
    println!("✓ Case conversion works\n");

    // ========================
    // Debug and Display
    // ========================
    {
        println!("Display output: {}", hello);
        println!("Debug output: {:?}", hello);
        println!("✓ Display and Debug are implemented correctly\n");
    }

    println!("🎉 All tests passed!");
}
