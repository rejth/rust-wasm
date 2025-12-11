(func $factorial (export "factorial") (param $n i32) (result i32)
  ;; Base cases: 
  ;; 1. factorial(0) = 1
  ;; 2. factorial(1) = 1

  local.get $n ;; Stack: [n]
  i32.const 2 ;; Stack: [n, 2]
  i32.lt_u ;; Check if "n" is less than 2

  if (result i32)
    ;; If exactly one "n" value is on the stack and n < 2 (0 or 1), return 1
    i32.const 1 ;; Leave 1 on the stack and return it -> Stack: [1]
  else
    ;; Else, we need to calculate n * (n - 1)!
    local.get $n ;; Stack: [n] - first parameter for multiplication
    local.get $n ;; Stack: [n, n] - second parameter to calculate n-1 later on
    i32.const 1 ;; Stack: [n, n, 1]
    i32.sub ;; Stack: [n, n-1] - the result (n-1) is pushed onto the stack

    ;; Recursively call the function to calculate (n - 1)! factorial
    call $factorial ;; (n-1) is consumed as a parameter on each recursive call, the recursive result is pushed onto the stack

    i32.mul ;; Multiplication -> Stack: [n * recursive call result]
  end
)