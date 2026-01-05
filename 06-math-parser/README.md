# Simple Math Parser: building AST from a string

Implement a parser for simple arithmetic expressions with single-letter variables and numbers. For example:

```text
a + b * 3
(x - 42) / y
a* b  +  c *d
```

Supported:

- variables: one letter `a..z`, `A..Z`
- single-digit numbers `0..9`
- operations: `+`, `-`, `*`, `/`
- parentheses: `( )`
- spaces are ignored

The usual priorities: `*` and `/` are higher than `+` and `-`, everything is left-associative.

**Task:**

1. Come up with and implement **your own token enumeration** (how will `+`, numbers, variables, etc. be represented).
2. Come up with and implement **the AST structure** (abstract syntax tree) for expressions.
3. Write two functions:

```rust
fn tokenize(input: &str) -> Vec<Token> { todo!() }

fn parse(input: &str) -> Expr { todo!() }
```

The `parse` function should:

1. Tokenize the string;
2. Build the AST;
3. Return an error with a meaningful text for any problem (unclosed bracket, unknown symbol, extra at the end, etc.).

For errors, you can use the panic mechanism.
