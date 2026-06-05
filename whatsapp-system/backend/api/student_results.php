<?php
$start_time = round(microtime(true) * 1000);
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? '';
$student_id = $_GET['student_id'] ?? '';

$status_code = 200;
$res_body = [];
$req_body = get_json_body();

try {
    if ($method === 'GET') {
        if (empty($student_id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "student_id is required"];
        } else {
            $stmt = $pdo->prepare("SELECT * FROM student_results WHERE student_id = :student_id ORDER BY created_at DESC");
            $stmt->execute(['student_id' => $student_id]);
            $results = $stmt->fetchAll();
            $res_body = $results;
        }
    } else if ($method === 'POST') {
        $new_id = generate_uuid();
        
        $s_id = $req_body['student_id'] ?? $req_body['studentId'] ?? '';
        $semester = $req_body['semester'] ?? '';
        $sgpa = $req_body['sgpa'] ?? '';
        $cgpa = $req_body['cgpa'] ?? '';
        $backlogs = isset($req_body['backlogs']) ? (int)$req_body['backlogs'] : 0;
        $exam_month_year = $req_body['exam_month_year'] ?? $req_body['examMonthYear'] ?? null;
        
        if (empty($s_id) || empty($semester) || empty($sgpa) || empty($cgpa)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "student_id, semester, sgpa, and cgpa are required"];
        } else {
            $sql = "INSERT INTO student_results (
                        id, student_id, semester, sgpa, cgpa, backlogs, exam_month_year
                    ) VALUES (
                        :id, :student_id, :semester, :sgpa, :cgpa, :backlogs, :exam_month_year
                    )";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'id' => $new_id,
                'student_id' => $s_id,
                'semester' => $semester,
                'sgpa' => $sgpa,
                'cgpa' => $cgpa,
                'backlogs' => $backlogs,
                'exam_month_year' => $exam_month_year
            ]);
            
            // Fetch and return the inserted row
            $stmt = $pdo->prepare("SELECT * FROM student_results WHERE id = :id");
            $stmt->execute(['id' => $new_id]);
            $res_body = $stmt->fetch();
        }
    } else if ($method === 'DELETE') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "ID is required for delete"];
        } else {
            $stmt = $pdo->prepare("DELETE FROM student_results WHERE id = :id");
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
