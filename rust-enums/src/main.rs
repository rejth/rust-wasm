#[derive(Debug, PartialEq)]
enum Expression {
    Number(i32),
    Variable(char),
    Operation {
        left: Box<Expression>,
        operator: char,
        right: Box<Expression>
    }
}

#[derive(Debug, PartialEq)]
enum ExpressionOperator {
    Operator(char),
    LeftBracket,
}

enum Token {
    Number(i32),
    Variable(char),
    Operator(char),
    LeftBracket,
    RightBracket,
}

fn precedence(operator: char) -> u8 {
    match operator {
        '*' | '/' => 2,
        '+' | '-' => 1,
        _ => 0
    }
}

fn tokenize(input: &str) -> Vec<Token> {
    let mut tokens: Vec<Token> = Vec::new();
    let mut chars = input.chars().peekable();

    while let Some(char) = chars.next() {
        match char {
            char if char.is_ascii_digit() => {
                let mut number = String::new();
                number.push(char);
                
                while let Some(&next_char) = chars.peek() {
                    if next_char.is_ascii_digit() {
                        number.push(next_char);
                        chars.next();
                    } else {
                        break;
                    }
                }
                
                let num = number.parse::<i32>().unwrap();
                tokens.push(Token::Number(num));
            }
            char if char.is_alphabetic() => {
                tokens.push(Token::Variable(char))
            }
            '+' | '-' | '*' | '/' => {
                tokens.push(Token::Operator(char))
            },
            '(' => {
                tokens.push(Token::LeftBracket)
            }
            ')' => {
                tokens.push(Token::RightBracket)
            }
            char if char.is_whitespace() => {
                continue
            },
            _ => panic!("Unknown symbol: {}", char)
        }
    }

    tokens
}

fn parse(input: &str) -> Expression {
    let tokens = tokenize(input);
    let mut operands: Vec<Expression> = Vec::new();
    let mut operators: Vec<ExpressionOperator> = Vec::new();

    fn build_operation(operands: &mut Vec<Expression>, operators: &mut Vec<ExpressionOperator>) {
        let last_operator = operators.pop().unwrap();

        if let ExpressionOperator::Operator(operator) = last_operator {
            let right = operands.pop().unwrap();
            let left = operands.pop().unwrap();
            operands.push(Expression::Operation {
                left: Box::new(left),
                operator,
                right: Box::new(right),
            });
        }
    }

    for token in tokens {
        match token {
            Token::Variable(var) => { 
                operands.push(Expression::Variable(var))
            },
            Token::Number(num) => { 
                operands.push(Expression::Number(num))
            },
            Token::Operator(operator) => { 
                while !operators.is_empty() {
                    let last = operators.last().unwrap();
                    
                    match last {
                        ExpressionOperator::LeftBracket => break,
                        ExpressionOperator::Operator(last_operator) => {
                            if precedence(*last_operator) >= precedence(operator) {
                                build_operation(&mut operands, &mut operators)
                            } else {
                                break;
                            }
                        }
                    }
                }

                operators.push(ExpressionOperator::Operator(operator));
            },
            Token::LeftBracket => {
                operators.push(ExpressionOperator::LeftBracket)
            },
            Token::RightBracket => {
                while !operators.is_empty() {
                    let last = operators.last().unwrap();
                    
                    match last {
                        ExpressionOperator::LeftBracket => break,
                        ExpressionOperator::Operator(_) => {
                            build_operation(&mut operands, &mut operators)
                        }
                    }
                }

                if operators.is_empty() {
                    panic!("No opening bracket found");
                }

                // Remove the opening bracket from the operator stack
                operators.pop().unwrap();
            },
        }
    }

    while !operators.is_empty() {
        let last = operators.last().unwrap();
        
        match last {
            ExpressionOperator::LeftBracket => break,
            ExpressionOperator::Operator(_) => {
                build_operation(&mut operands, &mut operators)
            }
        }
    }

    if !operators.is_empty() {
        panic!("Unmatched opening bracket found");
    } else if operands.len() != 1 {
        panic!("No root of the AST found");
    }

    operands.pop().unwrap()
}

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

    should_panic!("");                    // empty string
    should_panic!("a +");                 // incomplete expression
    should_panic!("a + b +");             // same
    should_panic!("(a + b");              // unclosed bracket
    should_panic!("a + b)");              // extra bracket
    should_panic!("a + * b");             // two operators in a row
    should_panic!("++a");                 // operator at the beginning
    should_panic!("a b");                 // two identifiers in a row
    should_panic!("123abc");              // number + letter without operator
    should_panic!("a! + b");              // unknown symbol
    should_panic!("@");                   // any garbage
    should_panic!("   ");                 // only spaces

    println!("All tests passed!");
}