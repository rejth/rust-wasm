use rust_enums::{Expression, parse};

fn main() {
    // 1. Simple atoms
    assert_eq!(parse("x"), Expression::Variable('x'));
    assert_eq!(parse("4"), Expression::Number(4));
    assert_eq!(parse("  3  "), Expression::Number(3));

    // 2. Simple binary operations
    assert_eq!(
        parse("a + b"),
        Expression::Operation {
            left: Box::new(Expression::Variable('a')),
            operator: '+',
            right: Box::new(Expression::Variable('b')),
        }
    );

    assert_eq!(
        parse("x*y"),
        Expression::Operation {
            left: Box::new(Expression::Variable('x')),
            operator: '*',
            right: Box::new(Expression::Variable('y')),
        }
    );

    // 3. Precedence
    assert_eq!(
        parse("a + b * c"),
        Expression::Operation {
            left: Box::new(Expression::Variable('a')),
            operator: '+',
            right: Box::new(Expression::Operation {
                left: Box::new(Expression::Variable('b')),
                operator: '*',
                right: Box::new(Expression::Variable('c')),
            }),
        }
    );

    assert_eq!(
        parse("a * b + c"),
        Expression::Operation {
            left: Box::new(Expression::Operation {
                left: Box::new(Expression::Variable('a')),
                operator: '*',
                right: Box::new(Expression::Variable('b')),
            }),
            operator: '+',
            right: Box::new(Expression::Variable('c')),
        }
    );

    // 4. Brackets change precedence
    assert_eq!(
        parse("(a + b) * c"),
        Expression::Operation {
            left: Box::new(Expression::Operation {
                left: Box::new(Expression::Variable('a')),
                operator: '+',
                right: Box::new(Expression::Variable('b')),
            }),
            operator: '*',
            right: Box::new(Expression::Variable('c')),
        }
    );

    // 5. Nested brackets
    assert_eq!(
        parse("((a + b) * c) + d"),
        Expression::Operation {
            left: Box::new(Expression::Operation {
                left: Box::new(Expression::Operation {
                    left: Box::new(Expression::Variable('a')),
                    operator: '+',
                    right: Box::new(Expression::Variable('b')),
                }),
                operator: '*',
                right: Box::new(Expression::Variable('c')),
            }),
            operator: '+',
            right: Box::new(Expression::Variable('d')),
        }
    );

    // 6. Complex chains
    assert_eq!(
        parse("a + b + c * d * e - f / g"),
        Expression::Operation {
            left: Box::new(Expression::Operation {
                left: Box::new(Expression::Operation {
                    left: Box::new(Expression::Variable('a')),
                    operator: '+',
                    right: Box::new(Expression::Variable('b')),
                }),
                operator: '+',
                right: Box::new(Expression::Operation {
                    left: Box::new(Expression::Operation {
                        left: Box::new(Expression::Variable('c')),
                        operator: '*',
                        right: Box::new(Expression::Variable('d')),
                    }),
                    operator: '*',
                    right: Box::new(Expression::Variable('e')),
                }),
            }),
            operator: '-',
            right: Box::new(Expression::Operation {
                left: Box::new(Expression::Variable('f')),
                operator: '/',
                right: Box::new(Expression::Variable('g')),
            }),
        }
    );

    // 7. Spaces everywhere - should not affect the result
    assert_eq!(parse("  a  +  (  x  *  3  )  "), parse("a+(x*3)"));

    // === Errors: should panic! ===

    macro_rules! should_panic {
        ($input:expr) => {{
            let result = std::panic::catch_unwind(|| parse($input));
            assert!(result.is_err(), "Expected panic on input: {}", $input);
        }};
    }

    should_panic!(""); // empty string
    should_panic!("a +"); // incomplete expression
    should_panic!("a + b +"); // same
    should_panic!("(a + b"); // unclosed bracket
    should_panic!("a + b)"); // extra bracket
    should_panic!("a + * b"); // two operators in a row
    should_panic!("++a"); // operator at the beginning
    should_panic!("a b"); // two identifiers in a row
    should_panic!("123abc"); // number + letter without operator
    should_panic!("a! + b"); // unknown symbol
    should_panic!("@"); // any garbage
    should_panic!("   "); // only spaces

    println!("All tests passed!");
}
