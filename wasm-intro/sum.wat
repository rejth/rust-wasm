(module
  (import "./sum.js" "logSumArgs" (func $js_log_sum_args (param i32 i32)))
  (import "./sum.js" "logSumResult" (func $js_log_sum_result (param i32)))

  (func (export "sum") (param $a i32) (param $b i32) (result i32)
    (local $result i32)
  
    local.get $a ;; Stack: [a]
    local.get $b ;; Stack: [a, b]
    call $js_log_sum_args ;; Consumes parameters from the stack -> Stack []

    local.get $a ;; Stack: [a]
    local.get $b ;; Stack: [a, b]
    i32.add  ;; Stack: [a+b]

    ;; 1. Removes parameter from stack
    ;; 2. Sets the value to the local variable
    ;; 3. Push the value back onto the stack -> Stack: [result]
    local.tee $result

    call $js_log_sum_result ;; Consumes parameters from the stack -> Stack []

    local.get $result ;; Stack: [result]
  )
)