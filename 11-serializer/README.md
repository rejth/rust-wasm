# Implementation of an extensible serialization library

Implement simple (but extensible) library for serializing data into various textual formats without relying on external libraries (e.g., serde, serde_json, bincode). Use `Result` and `Option` for error handling.

The library should consist of three main components:

- The `Serializer` trait describes how a specific format serializes data. It acts as a "visitor" that knows how to write primitives and structures.
- The `Serializable` trait is implemented by custom data types. It allows a type to "invite" a concrete serializer and delegate the serialization of its fields.
- Provide at least two serializers for different formats (e.g., a simple JSON-like serializer and a debug-style serializer).
