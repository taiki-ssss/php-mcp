<?php
namespace MyApp\Models;

use Exception;

interface PaymentInterface {
    public function processPayment(float $amount): bool;
}

trait Timestampable {
    private \DateTime $createdAt;
}

enum Status: string {
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
}

abstract class Vehicle {
    protected string $brand;
    abstract public function getType(): string;
}

class User implements PaymentInterface {
    use Timestampable;
    
    private int $id;
    private string $name;
    private readonly Status $status;
    
    public function __construct(int $id, string $name, Status $status = Status::ACTIVE) {
        $this->id = $id;
        $this->name = $name;
        $this->status = $status;
    }
    
    public function processPayment(float $amount): bool {
        if ($amount <= 0) {
            throw new \InvalidArgumentException('Amount must be positive');
        }
        return true;
    }
    
    public function getName(): string {
        return $this->name;
    }
}

function greet(string $name): string {
    return "Hello, $name!";
}

function add(int|float $a, int|float $b): int|float {
    return $a + $b;
}

function generateNumbers(int $start, int $end): \Iterator {
    for ($i = $start; $i <= $end; $i++) {
        yield $i;
    }
}

// Test basic constructs
$user = new User(1, "John");
$greeting = greet("World");
$sum = add(5, 10);

// Variables expected by tests
$name = "John Doe";
$number = 42;
$fruits = ['apple', 'banana', 'orange'];

// Arrow function
$multiply = fn($x, $y) => $x * $y;
$double = fn($n) => $n * 2;

// Match expression
$status = Status::ACTIVE;
$message = match($status) {
    Status::ACTIVE => "User is active",
    Status::INACTIVE => "User is inactive",
    default => "Unknown status"
};

// Use $number in conditions and match
if ($number > 40) {
    echo "Number is high";
} elseif ($number > 20) {
    echo "Number is medium";
}

$result = match($number) {
    42 => 'The answer',
    1..10 => 'Low',
    11..50 => 'Medium',
    default => 'High'
};

// Null coalescing
$config = $_ENV['CONFIG'] ?? 'default';

// Try-catch-finally
try {
    $result = $user->processPayment(100.50);
} catch (Exception $e) {
    echo $e->getMessage();
} finally {
    echo "Payment processed";
}

// Method calls
$userName = $user->getName();
echo $user->processPayment(50.0);

// Using this in a class context simulation
class Example {
    private string $value = "test";
    
    public function getValue(): string {
        return $this->value;
    }
    
    public function test(): void {
        $this->getValue();
    }
}

$example = new Example();
$value = $example->getValue();
?>