#[derive(Debug, PartialEq)]
pub enum Token {
    Number(i32),
    Variable(char),
    Operator(char),
    LeftBracket,
    RightBracket,
}

/// Tokenize the mathematical expression (like "1 + 2 * 3") into a vector of tokens.
///
/// # Examples
/// ```
/// use rust_enums::{tokenize, Token};
///
/// assert_eq!(tokenize("1 + 2"), vec![Token::Number(1), Token::Operator('+'), Token::Number(2)]);
/// assert_eq!(tokenize("x * y"), vec![Token::Variable('x'), Token::Operator('*'), Token::Variable('y')]);
/// assert_eq!(tokenize("(a + b) * c"), vec![Token::LeftBracket, Token::Variable('a'), Token::Operator('+'), Token::Variable('b'), Token::RightBracket, Token::Operator('*'), Token::Variable('c')]);
/// ```
pub fn tokenize(input: &str) -> Vec<Token> {
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
            char if char.is_alphabetic() => tokens.push(Token::Variable(char)),
            '+' | '-' | '*' | '/' => tokens.push(Token::Operator(char)),
            '(' => tokens.push(Token::LeftBracket),
            ')' => tokens.push(Token::RightBracket),
            char if char.is_whitespace() => continue,
            _ => panic!("Unknown symbol: {}", char),
        }
    }

    tokens
}

#[derive(Debug, PartialEq)]
pub enum Expression {
    Number(i32),
    Variable(char),
    Operation {
        left: Box<Expression>,
        operator: char,
        right: Box<Expression>,
    },
}

#[derive(Debug, PartialEq)]
enum ExpressionOperator {
    Operator(char),
    LeftBracket,
}

fn precedence(operator: char) -> u8 {
    match operator {
        '*' | '/' => 2,
        '+' | '-' => 1,
        _ => 0,
    }
}

/// Parse mathematical expressions (like 1 + 2 * 3) into an Abstract Syntax Tree (AST) using the Shunting Yard algorithm.
///
/// # Examples
/// ```
/// use rust_enums::{parse, Expression};
///
/// assert_eq!(parse("1 + 2"), Expression::Operation { left: Box::new(Expression::Number(1)), operator: '+', right: Box::new(Expression::Number(2)) });
/// assert_eq!(parse("x * y"), Expression::Operation { left: Box::new(Expression::Variable('x')), operator: '*', right: Box::new(Expression::Variable('y')) });
/// assert_eq!(parse("(a + b) * c"), Expression::Operation { left: Box::new(Expression::Operation { left: Box::new(Expression::Variable('a')), operator: '+', right: Box::new(Expression::Variable('b')) }), operator: '*', right: Box::new(Expression::Variable('c')) });
/// ```
pub fn parse(input: &str) -> Expression {
    let tokens = tokenize(input);

    /*
     Stores simple atoms (variables and numbers) and complete operations (subtrees).
     Each operation can be an operand itself for the lower precedence operations.
    */
    let mut operands: Vec<Expression> = Vec::new();
    // Stores operators and left brackets
    let mut operators: Vec<ExpressionOperator> = Vec::new();

    /// Build a tree node with the operator and the two operands
    fn build_operation(operands: &mut Vec<Expression>, operators: &mut Vec<ExpressionOperator>) {
        let popped_operator = operators.pop().unwrap();

        if let ExpressionOperator::Operator(operator) = popped_operator {
            let right_expression = operands.pop().unwrap();
            let left_expression = operands.pop().unwrap();
            operands.push(Expression::Operation {
                left: Box::new(left_expression),
                operator,
                right: Box::new(right_expression),
            });
        }
    }

    for token in tokens {
        match token {
            Token::Variable(var) => operands.push(Expression::Variable(var)),
            Token::Number(num) => operands.push(Expression::Number(num)),
            Token::Operator(operator) => {
                // Once an operator is found, process operators with higher or equal precedence (higher precedence operators such as * and / are processed first)
                while !operators.is_empty() {
                    let last = operators.last().unwrap();

                    match last {
                        ExpressionOperator::LeftBracket => break, // Means that we have reached the left bracket of the current operation - operation is complete
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
            }
            Token::LeftBracket => operators.push(ExpressionOperator::LeftBracket),
            Token::RightBracket => {
                // Once right bracket is found, process operators until the opening (left) bracket is found
                while !operators.is_empty() {
                    let last = operators.last().unwrap();

                    match last {
                        ExpressionOperator::LeftBracket => break, // Means that we have reached the left bracket of the current operation - operation is complete
                        ExpressionOperator::Operator(_) => {
                            build_operation(&mut operands, &mut operators)
                        }
                    }
                }

                if operators.is_empty() {
                    panic!("No opening bracket found - invalid expression");
                }

                // Remove the opening bracket from the operator stack as the operation is complete
                operators.pop().unwrap();
            }
        }
    }

    // Process remaining operators
    while !operators.is_empty() {
        let last = operators.last().unwrap();

        match last {
            ExpressionOperator::LeftBracket => {
                panic!("Unmatched opening bracket found - invalid expression")
            }
            ExpressionOperator::Operator(_) => build_operation(&mut operands, &mut operators),
        }
    }

    if operands.len() != 1 {
        panic!("No root of the AST found, operands: {}", operands.len());
    }

    // The root of the AST is the last and only operand
    operands.pop().unwrap()
}
