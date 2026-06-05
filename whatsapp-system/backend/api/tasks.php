<?php
$start_time = round(microtime(true) * 1000);
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? '';

$status_code = 200;
$res_body = [];
$req_body = get_json_body();

try {
    if ($method === 'GET') {
        if (!empty($id)) {
            $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $task = $stmt->fetch();
            if ($task) {
                $task['is_practice_question'] = (bool)$task['is_practice_question'];
                $res_body = $task;
            } else {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Task not found"];
            }
        } else {
            $stmt = $pdo->query("SELECT * FROM tasks ORDER BY created_at DESC");
            $tasks = $stmt->fetchAll();
            foreach ($tasks as &$task) {
                $task['is_practice_question'] = (bool)$task['is_practice_question'];
            }
            $res_body = $tasks;
        }
    } else if ($method === 'POST') {
        // Generate UUID if not provided by client
        $new_id = !empty($req_body['id']) ? $req_body['id'] : generate_uuid();
        
        $title = $req_body['title'] ?? '';
        $due_date = $req_body['due_date'] ?? $req_body['dueDate'] ?? null;
        $status = $req_body['status'] ?? 'pending';
        $assigned_to = $req_body['assigned_to'] ?? $req_body['assignedTo'] ?? null;
        $assigned_to_name = $req_body['assigned_to_name'] ?? $req_body['assignedToName'] ?? null;
        $category = $req_body['category'] ?? null;
        $description = $req_body['description'] ?? null;
        $is_practice_question = isset($req_body['is_practice_question']) || isset($req_body['isPracticeQuestion']) 
            ? (int)($req_body['is_practice_question'] ?? $req_body['isPracticeQuestion'] ?? 0) 
            : 0;
        $question_content = $req_body['question_content'] ?? $req_body['questionContent'] ?? null;
        
        if (empty($title)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "Title is required"];
        } else {
            $sql = "INSERT INTO tasks (
                        id, title, due_date, status, assigned_to, assigned_to_name, 
                        category, description, is_practice_question, question_content
                    ) VALUES (
                        :id, :title, :due_date, :status, :assigned_to, :assigned_to_name, 
                        :category, :description, :is_practice_question, :question_content
                    )";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'id' => $new_id,
                'title' => $title,
                'due_date' => $due_date,
                'status' => $status,
                'assigned_to' => $assigned_to,
                'assigned_to_name' => $assigned_to_name,
                'category' => $category,
                'description' => $description,
                'is_practice_question' => $is_practice_question,
                'question_content' => $question_content
            ]);
            
            // Fetch and return the inserted row
            $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = :id");
            $stmt->execute(['id' => $new_id]);
            $task = $stmt->fetch();
            $task['is_practice_question'] = (bool)$task['is_practice_question'];
            $res_body = $task;
        }
    } else if ($method === 'PUT') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "ID is required for update"];
        } else {
            // Check if task exists
            $stmt = $pdo->prepare("SELECT id FROM tasks WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if (!$stmt->fetch()) {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Task not found"];
            } else {
                $fields = [];
                $params = ['id' => $id];
                
                $fieldMapping = [
                    'title' => 'title',
                    'due_date' => 'due_date',
                    'dueDate' => 'due_date',
                    'status' => 'status',
                    'assigned_to' => 'assigned_to',
                    'assignedTo' => 'assigned_to',
                    'assigned_to_name' => 'assigned_to_name',
                    'assignedToName' => 'assigned_to_name',
                    'category' => 'category',
                    'description' => 'description',
                    'is_practice_question' => 'is_practice_question',
                    'isPracticeQuestion' => 'is_practice_question',
                    'question_content' => 'question_content',
                    'questionContent' => 'question_content'
                ];
                
                foreach ($req_body as $key => $val) {
                    if (isset($fieldMapping[$key])) {
                        $dbKey = $fieldMapping[$key];
                        $fields[] = "$dbKey = :$dbKey";
                        if ($dbKey === 'is_practice_question') {
                            $params[$dbKey] = (int)$val;
                        } else {
                            $params[$dbKey] = $val;
                        }
                    }
                }
                
                if (empty($fields)) {
                    $status_code = 400;
                    $res_body = ["success" => false, "error" => "No fields to update"];
                } else {
                    $sql = "UPDATE tasks SET " . implode(", ", $fields) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    
                    // Fetch and return the updated row
                    $stmt = $pdo->prepare("SELECT * FROM tasks WHERE id = :id");
                    $stmt->execute(['id' => $id]);
                    $task = $stmt->fetch();
                    $task['is_practice_question'] = (bool)$task['is_practice_question'];
                    $res_body = $task;
                }
            }
        }
    } else if ($method === 'DELETE') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "ID is required for delete"];
        } else {
            $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $res_body = ["success" => true];
        }
    } else {
        $status_code = 405;
        $res_body = ["success" => false, "error" => "Method not allowed"];
    }
} catch (Exception $e) {
    $status_code = 500;
    $res_body = ["success" => false, "error" => $e->getMessage()];
}

http_response_code($status_code);
echo json_encode($res_body);

$duration = round(microtime(true) * 1000) - $start_time;
write_api_log(
    $method, 
    $_SERVER['REQUEST_URI'], 
    $status_code, 
    $duration, 
    getallheaders(), 
    $_GET, 
    $req_body, 
    $res_body
);
