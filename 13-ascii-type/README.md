# Implementation of the AsciiString type

Implement a `AsciiString` structure that represents an **owned**, **mutable** string containing only ASCII characters (bytes from 0 to 127 inclusive).

## Requirements

1. When creating an `AsciiString` from regular string data (`&str`, `String`, etc.), a check must be performed: if any non-ASCII character is encountered, the program should panic with a clear and understandable error message.

2. The type should support convenient ways of being created from valid sources. Implement standard traits such as `From`, `TryFrom`, `AsRef`, and similar.

3. It should be possible to use `AsciiString` like a regular string in most common operations (length, substring search, case conversion, etc.) without requiring explicit additional method calls.

4. The type must work correctly with **debug printing**, **equality comparison**, **cloning**, and should have a reasonable default value.
