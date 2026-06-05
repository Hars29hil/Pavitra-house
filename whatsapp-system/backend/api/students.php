<?php
$start_time = round(microtime(true) * 1000);
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$id = $_GET['id'] ?? '';

$status_code = 200;
$res_body = [];
$req_body = get_json_body();

// Route logic
try {
    if ($method === 'GET') {
        if ($action === 'social-info') {
            // Get all student social media info and mobile numbers
            $stmt = $pdo->query("SELECT id, name, mobile, linkedin, social_link FROM students");
            $students = $stmt->fetchAll();
            $res_body = [
                "success" => true,
                "count" => count($students),
                "students" => $students
            ];
        } else if (!empty($_GET['mobile'])) {
            // Get a single student by mobile number
            $stmt = $pdo->prepare("SELECT * FROM students WHERE mobile = :mobile LIMIT 1");
            $stmt->execute(['mobile' => $_GET['mobile']]);
            $student = $stmt->fetch();
            if ($student) {
                // Ensure is_alumni is boolean
                $student['is_alumni'] = (bool)$student['is_alumni'];
                $res_body = $student;
            } else {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Student not found"];
            }
        } else if (!empty($id)) {
            // Get a single student
            $stmt = $pdo->prepare("SELECT * FROM students WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $student = $stmt->fetch();
            if ($student) {
                // Ensure is_alumni is boolean
                $student['is_alumni'] = (bool)$student['is_alumni'];
                $res_body = $student;
            } else {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Student not found"];
            }
        } else {
            // Get all students
            $stmt = $pdo->query("SELECT * FROM students ORDER BY name ASC");
            $students = $stmt->fetchAll();
            // Ensure types match
            foreach ($students as &$student) {
                $student['is_alumni'] = (bool)$student['is_alumni'];
            }
            $res_body = $students;
        }
    } else if ($method === 'POST') {
        if ($action === 'upsert') {
            // Batch upsert students (e.g. from Excel upload)
            if (!is_array($req_body)) {
                $status_code = 400;
                $res_body = ["success" => false, "error" => "Invalid body format, array expected"];
            } else {
                $upserted = [];
                $pdo->beginTransaction();
                
                $sql = "INSERT INTO students (
                            id, room_no, name, age, dob, mobile, email, degree, year, 
                            result, interest, is_alumni, profile_image, job, college,
                            linkedin, social_link
                        ) VALUES (
                            :id, :room_no, :name, :age, :dob, :mobile, :email, :degree, :year, 
                            :result, :interest, :is_alumni, :profile_image, :job, :college,
                            :linkedin, :social_link
                        ) ON DUPLICATE KEY UPDATE 
                            room_no = VALUES(room_no),
                            name = VALUES(name),
                            age = VALUES(age),
                            dob = VALUES(dob),
                            mobile = VALUES(mobile),
                            email = VALUES(email),
                            degree = VALUES(degree),
                            year = VALUES(year),
                            result = VALUES(result),
                            interest = VALUES(interest),
                            is_alumni = VALUES(is_alumni),
                            profile_image = VALUES(profile_image),
                            job = VALUES(job),
                            college = VALUES(college),
                            linkedin = VALUES(linkedin),
                            social_link = VALUES(social_link)";
                
                $stmt = $pdo->prepare($sql);
                
                foreach ($req_body as $student) {
                    $s_id = !empty($student['id']) ? $student['id'] : generate_uuid();
                    
                    $params = [
                        'id' => $s_id,
                        'room_no' => $student['room_no'] ?? $student['roomNo'] ?? null,
                        'name' => $student['name'] ?? '',
                        'age' => isset($student['age']) ? (int)$student['age'] : null,
                        'dob' => $student['dob'] ?? null,
                        'mobile' => $student['mobile'] ?? null,
                        'email' => $student['email'] ?? null,
                        'degree' => $student['degree'] ?? null,
                        'year' => $student['year'] ?? null,
                        'result' => $student['result'] ?? null,
                        'interest' => $student['interest'] ?? null,
                        'is_alumni' => isset($student['is_alumni']) || isset($student['isNo']) ? (int)($student['is_alumni'] ?? $student['isNo'] ?? 0) : 0,
                        'profile_image' => $student['profile_image'] ?? $student['profileImage'] ?? null,
                        'job' => $student['job'] ?? null,
                        'college' => $student['college'] ?? null,
                        'linkedin' => $student['linkedin'] ?? null,
                        'social_link' => $student['social_link'] ?? $student['socialLink'] ?? null
                    ];
                    
                    $stmt->execute($params);
                    
                    // Fetch the upserted student row
                    $fetchStmt = $pdo->prepare("SELECT * FROM students WHERE id = :id");
                    $fetchStmt->execute(['id' => $s_id]);
                    $upsertedRow = $fetchStmt->fetch();
                    if ($upsertedRow) {
                        $upsertedRow['is_alumni'] = (bool)$upsertedRow['is_alumni'];
                        $upserted[] = $upsertedRow;
                    }
                }
                
                $pdo->commit();
                $res_body = $upserted;
            }
        } else {
            // Add a single student
            $new_id = generate_uuid();
            $sql = "INSERT INTO students (
                        id, room_no, name, age, dob, mobile, email, degree, year, 
                        result, interest, is_alumni, profile_image, job, college,
                        linkedin, social_link
                    ) VALUES (
                        :id, :room_no, :name, :age, :dob, :mobile, :email, :degree, :year, 
                        :result, :interest, :is_alumni, :profile_image, :job, :college,
                        :linkedin, :social_link
                    )";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'id' => $new_id,
                'room_no' => $req_body['room_no'] ?? $req_body['roomNo'] ?? null,
                'name' => $req_body['name'] ?? '',
                'age' => isset($req_body['age']) ? (int)$req_body['age'] : null,
                'dob' => $req_body['dob'] ?? null,
                'mobile' => $req_body['mobile'] ?? null,
                'email' => $req_body['email'] ?? null,
                'degree' => $req_body['degree'] ?? null,
                'year' => $req_body['year'] ?? null,
                'result' => $req_body['result'] ?? null,
                'interest' => $req_body['interest'] ?? null,
                'is_alumni' => isset($req_body['is_alumni']) ? (int)$req_body['is_alumni'] : 0,
                'profile_image' => $req_body['profile_image'] ?? $req_body['profileImage'] ?? null,
                'job' => $req_body['job'] ?? null,
                'college' => $req_body['college'] ?? null,
                'linkedin' => $req_body['linkedin'] ?? null,
                'social_link' => $req_body['social_link'] ?? $req_body['socialLink'] ?? null
            ]);
            
            // Fetch and return the inserted row
            $stmt = $pdo->prepare("SELECT * FROM students WHERE id = :id");
            $stmt->execute(['id' => $new_id]);
            $student = $stmt->fetch();
            if ($student) {
                $student['is_alumni'] = (bool)$student['is_alumni'];
                $res_body = $student;
            } else {
                $status_code = 500;
                $res_body = ["success" => false, "error" => "Failed to fetch created student"];
            }
        }
    } else if ($method === 'PUT') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "Student ID is required for update"];
        } else {
            // Check if student exists
            $stmt = $pdo->prepare("SELECT id FROM students WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if (!$stmt->fetch()) {
                $status_code = 404;
                $res_body = ["success" => false, "error" => "Student not found"];
            } else {
                // Dynamically construct update fields based on body keys
                $fields = [];
                $params = ['id' => $id];
                
                // Map camelCase from frontend to snake_case in DB
                $fieldMapping = [
                    'room_no' => 'room_no',
                    'roomNo' => 'room_no',
                    'name' => 'name',
                    'age' => 'age',
                    'dob' => 'dob',
                    'mobile' => 'mobile',
                    'email' => 'email',
                    'degree' => 'degree',
                    'year' => 'year',
                    'result' => 'result',
                    'interest' => 'interest',
                    'is_alumni' => 'is_alumni',
                    'isAlumni' => 'is_alumni',
                    'profile_image' => 'profile_image',
                    'profileImage' => 'profile_image',
                    'job' => 'job',
                    'college' => 'college',
                    'linkedin' => 'linkedin',
                    'social_link' => 'social_link',
                    'socialLink' => 'social_link'
                ];

                foreach ($req_body as $key => $val) {
                    if (isset($fieldMapping[$key])) {
                        $dbKey = $fieldMapping[$key];
                        $fields[] = "$dbKey = :$dbKey";
                        if ($dbKey === 'is_alumni') {
                            $params[$dbKey] = (int)$val;
                        } else if ($dbKey === 'age') {
                            $params[$dbKey] = $val !== null ? (int)$val : null;
                        } else {
                            $params[$dbKey] = $val;
                        }
                    }
                }

                if (empty($fields)) {
                    $status_code = 400;
                    $res_body = ["success" => false, "error" => "No fields to update"];
                } else {
                    $sql = "UPDATE students SET " . implode(", ", $fields) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    
                    // Fetch and return the updated row
                    $stmt = $pdo->prepare("SELECT * FROM students WHERE id = :id");
                    $stmt->execute(['id' => $id]);
                    $student = $stmt->fetch();
                    $student['is_alumni'] = (bool)$student['is_alumni'];
                    $res_body = $student;
                }
            }
        }
    } else if ($method === 'DELETE') {
        if (empty($id)) {
            $status_code = 400;
            $res_body = ["success" => false, "error" => "Student ID is required for delete"];
        } else {
            $stmt = $pdo->prepare("DELETE FROM students WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $res_body = ["success" => true];
        }
    } else {
        $status_code = 405;
        $res_body = ["success" => false, "error" => "Method not allowed"];
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $status_code = 500;
    $res_body = ["success" => false, "error" => $e->getMessage()];
}

// Log and output response
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
