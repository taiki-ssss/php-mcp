<?php
declare(strict_types=1);

// Namespace and use statements
namespace MyApp\Models;

use Exception;
use InvalidArgumentException;
use Iterator;
use JsonSerializable;
use RuntimeException;
use Throwable;

// Interface
interface PaymentInterface {
    public function processPayment(float $amount): bool;
    public function getTransactionId(): ?string;
}

// Trait
trait Timestampable {
    protected ?\DateTime $createdAt = null;
    protected ?\DateTime $updatedAt = null;
    
    public function setCreatedAt(\DateTime $createdAt): void {
        $this->createdAt = $createdAt;
    }
    
    public function getCreatedAt(): ?\DateTime {
        return $this->createdAt;
    }
}

// Enum
enum Status: string {
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case PENDING = 'pending';
    case DELETED = 'deleted';
}

// Abstract class
abstract class Vehicle {
    protected string $brand;
    protected int $year;
    
    abstract public function getType(): string;
    abstract protected function calculateSpeed(): float;
    
    public function getInfo(): string {
        return "{$this->brand} ({$this->year})";
    }
}

// Regular class with various features
class User implements PaymentInterface, JsonSerializable {
    use Timestampable;
    
    private int $id;
    private string $name;
    private ?string $email;
    private readonly Status $status;
    private static int $totalUsers = 0;
    
    public function __construct(
        int $id,
        string $name,
        ?string $email = null,
        Status $status = Status::ACTIVE
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->status = $status;
        self::$totalUsers++;
    }
    
    public function getName(): string {
        return $this->name;
    }
    
    public function getEmail(): ?string {
        return $this->email;
    }
    
    public function processPayment(float $amount): bool {
        // Payment processing logic
        if ($amount <= 0) {
            throw new InvalidArgumentException('Amount must be positive');
        }
        
        try {
            // Simulate payment processing
            $success = random_int(0, 10) > 2;
            
            if (!$success) {
                throw new RuntimeException('Payment failed');
            }
            
            return true;
        } catch (RuntimeException $e) {
            // Log error
            error_log($e->getMessage());
            return false;
        } finally {
            // Always log attempt
            error_log("Payment attempt for user {$this->id}: $amount");
        }
    }
    
    public function getTransactionId(): ?string {
        return uniqid('txn_', true);
    }
    
    public function jsonSerialize(): mixed {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status->value,
        ];
    }
    
    public static function getTotalUsers(): int {
        return self::$totalUsers;
    }
}

// Class with modern PHP features
class Product {
    private int $id;
    private string $name;
    private float $price;
    private array $tags = [];
    
    public function __construct(
        int $id,
        string $name,
        float $price,
        array $tags = []
    ) {
        $this->id = $id;
        $this->name = $name;
        $this->price = $price;
        $this->tags = $tags;
    }
    
    // Arrow function usage
    public function getFormattedTags(): array {
        return array_map(fn($tag) => strtoupper($tag), $this->tags);
    }
    
    // Match expression
    public function getCategory(): string {
        return match($this->price) {
            0.0 => 'free',
            default => 'expensive',
        };
    }
    
    // Null coalescing operator
    public function getFirstTag(): string {
        return $this->tags[0] ?? 'untagged';
    }
}

// Functions
function greet(string $name): string {
    return "Hello, $name!";
}

function add(int|float $a, int|float $b): int|float {
    return $a + $b;
}

// Generator function
function generateNumbers(int $start, int $end): Iterator {
    for ($i = $start; $i <= $end; $i++) {
        yield $i;
    }
}

// Anonymous function
$multiply = function(int $x, int $y): int {
    return $x * $y;
};

// Arrow function
$divide = fn(float $x, float $y) => $y !== 0.0 ? $x / $y : null;

// Global code
$name = "John Doe";
$number = 42;
$fruits = ['apple', 'banana', 'orange'];

// Control structures
if ($number > 40) {
    echo greet($name);
} elseif ($number > 20) {
    echo "Number is moderate";
} else {
    echo "Number is small";
}

// Match expression
$result = match($number) {
    0 => 'zero',
    1, 2, 3 => 'small',
    default => 'large',
};

// Loops
foreach ($fruits as $index => $fruit) {
    echo "$index: $fruit\n";
}

for ($i = 0; $i < 5; $i++) {
    if ($i === 2) continue;
    if ($i === 4) break;
    echo $i;
}

while (count($fruits) > 0) {
    $fruit = array_pop($fruits);
    echo $fruit;
}

do {
    $randomNumber = random_int(1, 10);
} while ($randomNumber < 5);

// Try-catch with modern features
try {
    $user = new User(1, "John Doe", "john@example.com");
    $payment = $user->processPayment(100.50);
    
    if (!$payment) {
        throw new Exception("Payment processing failed");
    }
} catch (InvalidArgumentException $e) {
    echo "Invalid argument: " . $e->getMessage();
} catch (RuntimeException | Exception $e) {
    echo "Error: " . $e->getMessage();
} finally {
    echo "Transaction completed";
}

// Switch statement
switch ($result) {
    case 'zero':
        echo "It's zero";
        break;
    case 'small':
    case 'medium':
        echo "It's small or medium";
        break;
    default:
        echo "It's something else";
}

// Null coalescing assignment
$config = [];
$config['debug'] ??= false;
$config['timezone'] ??= 'UTC';

// Array destructuring
[$first, $second, $third] = ['a', 'b', 'c'];
['name' => $userName, 'age' => $userAge] = ['name' => 'Alice', 'age' => 30];

// Variadic functions
function sum(...$numbers): int {
    return array_sum($numbers);
}

// Named arguments usage
$article = new Article(
    title: "PHP 8 Features",
    content: "Modern PHP features explained",
    author: "Jane Doe",
    publishedAt: new \DateTime()
);

// Class with constructor property promotion
class Article {
    public function __construct(
        private string $title,
        private string $content,
        private string $author,
        private \DateTime $publishedAt,
        private ?string $category = null
    ) {}
    
    public function getTitle(): string {
        return $this->title;
    }
    
    public function getSlug(): string {
        return strtolower(str_replace(' ', '-', $this->title));
    }
}

?>