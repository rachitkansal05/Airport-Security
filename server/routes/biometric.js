const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const multer = require('multer');
const { promisify } = require('util');
const ProofSubmission = require('../models/ProofSubmission');
const User = require('../models/User');

// Custom middleware to restrict police users from accessing biometric routes
const restrictPolice = (req, res, next) => {
  if (req.user && req.user.role === 'police') {
    return res.status(403).json({ message: 'Police users do not have access to biometric verification features' });
  }
  next();
};

// Custom middleware to restrict non-police users from accessing zkp verification routes
const onlyPolice = (req, res, next) => {
  if (req.user && req.user.role !== 'police') {
    return res.status(403).json({ message: 'Only police users have access to ZKP verification features' });
  }
  next();
};

// Promisify exec for cleaner async/await code
const execPromise = promisify(exec);

// Create the necessary directories if they don't exist
const uploadDir = path.join(__dirname, '../uploads');
const tempDir = path.join(__dirname, '../temp');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Only allow tif files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/tiff') {
    cb(null, true);
  } else {
    cb(new Error('Only TIFF files are allowed'), false);
  }
};

// File filter for JSON files
const jsonFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/json' || path.extname(file.originalname) === '.json') {
    cb(null, true);
  } else {
    cb(new Error('Only JSON files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure multer for JSON file uploads
const jsonUpload = multer({
  storage: storage,
  fileFilter: jsonFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route to handle fingerprint image upload and preprocessing
router.post('/upload-fingerprint', auth, restrictPolice, upload.single('fingerprint'), async (req, res) => {
  try {
    console.log('Fingerprint upload request received:');
    console.log('- Headers:', req.headers);
    console.log('- Client IP:', req.ip || req.connection.remoteAddress);
    
    if (!req.file) {
      console.log('No file received in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('File received:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Get the uploaded file path
    const filePath = req.file.path;
    const fileName = path.basename(filePath);
    const pklFilePath = path.join(tempDir, `${fileName}.pkl`);

    try {
      // Run the preprocessing script
      const preprocessCmd = `python3 ${path.join(tempDir, 'preprocess.py')} ${filePath} ${pklFilePath}`;
      console.log(`Executing: ${preprocessCmd}`);
      
      const { stdout, stderr } = await execPromise(preprocessCmd);
      
      if (stderr) {
        console.log('Preprocessing stderr:', stderr);
      }
      
      console.log('Preprocessing stdout:', stdout);

      // Return the paths for the next step
      res.status(200).json({ 
        message: 'Preprocessing completed',
        filePath,
        pklFilePath
      });
    } catch (cmdError) {
      console.error(`Preprocessing error:`, cmdError);
      return res.status(500).json({ 
        message: 'Preprocessing failed', 
        error: cmdError.message,
        command: `python3 ${path.join(tempDir, 'preprocess.py')} ${filePath} ${pklFilePath}`
      });
    }
  } catch (error) {
    console.error('Upload processing error:', error);
    res.status(500).json({ message: 'An error occurred during file processing', error: error.message });
  }
});

// Route for police officers to upload and verify proof.json and public.json files
router.post('/verify-zkp', auth, onlyPolice, jsonUpload.fields([
  { name: 'proof', maxCount: 1 },
  { name: 'public', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('ZKP verification request received:');
    console.log('- Headers:', req.headers);
    console.log('- Client IP:', req.ip || req.connection.remoteAddress);
    
    if (!req.files || !req.files.proof || !req.files.public) {
      console.log('Missing required files');
      return res.status(400).json({ message: 'Both proof.json and public.json files are required' });
    }

    const proofFile = req.files.proof[0];
    const publicFile = req.files.public[0];
    
    console.log('Files received:', {
      proof: {
        filename: proofFile.filename,
        originalname: proofFile.originalname,
        size: proofFile.size
      },
      public: {
        filename: publicFile.filename,
        originalname: publicFile.originalname,
        size: publicFile.size
      }
    });

    // Get the uploaded file paths
    const proofFilePath = proofFile.path;
    const publicFilePath = publicFile.path;
    
    // Check multiple possible locations for the verification key
    const possibleKeyLocations = [
      path.join(tempDir, 'verification_key.json'),
      path.join(tempDir, 'circuit_verification_key.json'),
      path.join(tempDir, 'mia2_verification_key.json'),
      path.join(__dirname, '../temp/verification_key.json'),
      path.join(__dirname, '../../keys/verification_key.json')
    ];
    
    // Find the first verification key that exists
    let verificationKeyPath = '';
    for (const keyPath of possibleKeyLocations) {
      if (fs.existsSync(keyPath)) {
        verificationKeyPath = keyPath;
        console.log(`Found verification key at: ${keyPath}`);
        break;
      }
    }
    
    // If verification key not found in common locations, try to generate it from the proving key if it exists
    if (!verificationKeyPath) {
      console.log('Verification key not found in common locations, attempting to export it from zkey file...');
      
      const zkeyFile = path.join(tempDir, 'circuit_0001.zkey');
      if (fs.existsSync(zkeyFile)) {
        try {
          const newVerificationKeyPath = path.join(tempDir, 'verification_key.json');
          const exportVerificationKeyCmd = `snarkjs zkey export verificationkey ${zkeyFile} ${newVerificationKeyPath}`;
          console.log(`Executing: ${exportVerificationKeyCmd}`);
          
          await execPromise(exportVerificationKeyCmd);
          console.log(`Successfully generated verification key at: ${newVerificationKeyPath}`);
          verificationKeyPath = newVerificationKeyPath;
        } catch (exportError) {
          console.error('Failed to export verification key:', exportError);
        }
      }
    }
    
    // If we still can't find the verification key, return an error
    if (!verificationKeyPath) {
      console.error('Verification key file not found in any expected location');
      return res.status(500).json({ 
        message: 'Verification key not found', 
        error: 'The verification key file is missing. Please contact your administrator.',
        possibleLocations: possibleKeyLocations
      });
    }
    
    // Create a custom verification function that won't throw an error
    const verifyProof = async () => {
      try {
        // Run the verification command with the shell option to ensure full output capture
        const verifyCmd = `snarkjs groth16 verify ${verificationKeyPath} ${publicFilePath} ${proofFilePath}`;
        console.log(`Executing: ${verifyCmd}`);
        
        const { stdout, stderr } = await execPromise(verifyCmd, { shell: true });
        console.log('Verification stdout:', stdout);
        
        if (stderr) {
          console.log('Verification stderr:', stderr);
          return {
            success: false,
            verified: false,
            tampered: true,
            message: 'The proof is invalid or has been tampered with.',
            details: stderr
          };
        }
        
        // Extract result from output
        const verificationSuccess = stdout.includes('OK');
        
        return {
          success: true,
          verified: verificationSuccess,
          tampered: !verificationSuccess,
          message: verificationSuccess 
            ? 'Verification successful: The proof is valid!' 
            : 'Verification failed: The proof is invalid or has been tampered with.',
          details: stdout
        };
      } catch (error) {
        console.error('Verification execution error:', error);
        // Even if the command fails, consider it a successful operation with a failed verification
        return {
          success: true,
          verified: false,
          tampered: true,
          message: 'Verification failed: The proof has been tampered with or is invalid.',
          details: error.message || 'The cryptographic verification could not be completed. The proof may be corrupted or tampered with.'
        };
      }
    };
    
    // Execute the verification and always return a 200 status
    const result = await verifyProof();
    
    // Return the verification result with HTTP 200 status regardless of verification result
    // This way, the frontend will always receive a proper JSON response to display
    return res.status(200).json({
      verified: result.verified,
      tampered: result.tampered,
      message: result.message,
      details: result.details
    });
  } catch (error) {
    // If there's an error in the route handler itself, return a 500
    console.error('Verification route error:', error);
    res.status(500).json({ 
      message: 'An unexpected error occurred during verification', 
      error: error.message,
      verified: false,
      tampered: false
    });
  }
});

// Step 1: Generate circom input
router.post('/generate-circom-input', auth, restrictPolice, async (req, res) => {
  try {
    const { pklFile1, pklFile2 } = req.body;

    console.log('Generating circom input with files:', { pklFile1, pklFile2 });

    if (!pklFile1 || !pklFile2) {
      return res.status(400).json({ message: 'Both PKL files are required' });
    }

    // Check if files exist
    if (!fs.existsSync(pklFile1)) {
      return res.status(400).json({ message: `File not found: ${pklFile1}` });
    }
    
    if (!fs.existsSync(pklFile2)) {
      return res.status(400).json({ message: `File not found: ${pklFile2}` });
    }

    const circomInputFile = path.join(tempDir, 'circom_input.json');

    try {
      // Step 1: Run the Python script to generate the input for circom
      console.log('Running app2.py to generate circom input...');
      const app2Cmd = `python3 ${path.join(tempDir, 'app2.py')} "${pklFile1}" "${pklFile2}"`;
      console.log(`Executing: ${app2Cmd}`);
      
      // Add a longer timeout for the Python script execution
      const { stdout, stderr } = await execPromise(app2Cmd, { timeout: 30000 });
      
      // Log output for debugging
      console.log('app2.py stdout:');
      console.log(stdout);
      
      if (stderr) {
        console.log('app2.py stderr:');
        console.log(stderr);
      }

      // Check if circom_input.json was created
      if (!fs.existsSync(circomInputFile)) {
        console.error('circom_input.json was not created by app2.py');
        return res.status(500).json({ 
          message: 'Failed to generate circom input file',
          error: 'Output file not created',
          stdout,
          stderr
        });
      }

      // Return result with the path to the circom input file
      return res.status(200).json({
        message: 'Circom input generated successfully',
        circomInputFile
      });
    } catch (cmdError) {
      console.error('Command execution error:', cmdError);
      return res.status(500).json({ 
        message: 'Failed to generate circom input', 
        error: cmdError.message,
        command: app2Cmd
      });
    }
  } catch (error) {
    console.error('Circom input generation error:', error);
    res.status(500).json({ message: 'An error occurred during circom input generation', error: error.message });
  }
});

// Step 2: Generate witness
router.post('/generate-witness', auth, restrictPolice, async (req, res) => {
  try {
    const { circomInputFile } = req.body;
    
    console.log('Generating witness from circom input:', circomInputFile);

    if (!circomInputFile) {
      return res.status(400).json({ message: 'circomInputFile is required' });
    }

    // Check if circom input file exists
    if (!fs.existsSync(circomInputFile)) {
      return res.status(400).json({ message: `Circom input file not found: ${circomInputFile}` });
    }

    const witnessFile = path.join(tempDir, 'witness.wtns');
    const wasmFile = path.join(tempDir, 'mia2_js/mia2.wasm');

    try {
      console.log('Generating witness...');
      const generateWitnessCmd = `node ${path.join(tempDir, 'mia2_js/generate_witness.js')} ${wasmFile} ${circomInputFile} ${witnessFile}`;
      console.log(`Executing: ${generateWitnessCmd}`);
      
      const { stdout, stderr } = await execPromise(generateWitnessCmd);
      
      if (stderr) {
        console.log('Witness generation stderr:', stderr);
      }
      console.log('Witness generation stdout:', stdout);

      // Check if witness.wtns was created
      if (!fs.existsSync(witnessFile)) {
        console.error('witness.wtns was not created');
        return res.status(500).json({ 
          message: 'Failed to generate witness file',
          error: 'Output file not created'
        });
      }

      // Return result with the path to the witness file
      return res.status(200).json({
        message: 'Witness generated successfully',
        witnessFile
      });
    } catch (cmdError) {
      console.error('Witness generation error:', cmdError);
      return res.status(500).json({ 
        message: 'Failed to generate witness', 
        error: cmdError.message
      });
    }
  } catch (error) {
    console.error('Witness generation error:', error);
    res.status(500).json({ message: 'An error occurred during witness generation', error: error.message });
  }
});

// Step 3: Generate proof
router.post('/generate-proof', auth, restrictPolice, async (req, res) => {
  try {
    const { witnessFile } = req.body;
    
    console.log('Generating proof from witness:', witnessFile);

    if (!witnessFile) {
      return res.status(400).json({ message: 'witnessFile is required' });
    }

    // Check if witness file exists
    if (!fs.existsSync(witnessFile)) {
      return res.status(400).json({ message: `Witness file not found: ${witnessFile}` });
    }

    const zkeyFile = path.join(tempDir, 'circuit_0001.zkey');
    const proofFile = path.join(tempDir, 'proof.json');
    const publicFile = path.join(tempDir, 'public.json');

    try {
      console.log('Generating proof...');
      const generateProofCmd = `snarkjs groth16 prove ${zkeyFile} ${witnessFile} ${proofFile} ${publicFile}`;
      console.log(`Executing: ${generateProofCmd}`);
      
      const { stdout, stderr } = await execPromise(generateProofCmd);
      
      if (stderr) {
        console.log('Proof generation stderr:', stderr);
      }
      console.log('Proof generation stdout:', stdout);

      // Check if proof.json and public.json were created
      if (!fs.existsSync(proofFile) || !fs.existsSync(publicFile)) {
        console.error('Proof or public input files were not created');
        return res.status(500).json({ 
          message: 'Failed to generate proof',
          error: 'Output files not created'
        });
      }

      // Read the proof and public files to verify they exist
      console.log('Reading proof and public input files...');
      const proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
      const publicInputs = JSON.parse(fs.readFileSync(publicFile, 'utf8'));

      console.log('Proof generation completed successfully');
      // Return success response but don't include file contents
      return res.status(200).json({
        message: 'Proof generated successfully',
        matchFound: publicInputs[0] === '1', // The first public input indicates a match
        proofReady: true,
        // Include paths for submission reference
        proofPath: proofFile,
        publicPath: publicFile
      });
    } catch (cmdError) {
      console.error('Proof generation error:', cmdError);
      return res.status(500).json({ 
        message: 'Failed to generate proof', 
        error: cmdError.message
      });
    }
  } catch (error) {
    console.error('Proof generation error:', error);
    res.status(500).json({ message: 'An error occurred during proof generation', error: error.message });
  }
});

// Original all-in-one route (kept for backward compatibility)
router.post('/verify', auth, restrictPolice, async (req, res) => {
  try {
    const { pklFile1, pklFile2 } = req.body;

    console.log('Verification request received with files:', { pklFile1, pklFile2 });

    if (!pklFile1 || !pklFile2) {
      return res.status(400).json({ message: 'Both PKL files are required' });
    }

    // Check if files exist
    if (!fs.existsSync(pklFile1)) {
      return res.status(400).json({ message: `File not found: ${pklFile1}` });
    }
    
    if (!fs.existsSync(pklFile2)) {
      return res.status(400).json({ message: `File not found: ${pklFile2}` });
    }

    // Define all paths up front
    const circomInputFile = path.join(tempDir, 'circom_input.json');
    const witnessFile = path.join(tempDir, 'witness.wtns');
    const witnessJsonFile = path.join(tempDir, 'witness.json');
    const wasmFile = path.join(tempDir, 'mia2_js/mia2.wasm');
    const zkeyFile = path.join(tempDir, 'circuit_0001.zkey');
    const proofFile = path.join(tempDir, 'proof.json');
    const publicFile = path.join(tempDir, 'public.json');

    try {
      // Step 1: Run the Python script to generate the input for circom
      console.log('Running app2.py to generate circom input...');
      const app2Cmd = `python3 ${path.join(tempDir, 'app2.py')} ${pklFile1} ${pklFile2}`;
      console.log(`Executing: ${app2Cmd}`);
      
      const { stdout: app2Stdout, stderr: app2Stderr } = await execPromise(app2Cmd);
      
      if (app2Stderr) {
        console.log('app2.py stderr:', app2Stderr);
      }
      console.log('app2.py stdout:', app2Stdout);

      // Check if circom_input.json was created
      if (!fs.existsSync(circomInputFile)) {
        console.error('circom_input.json was not created by app2.py');
        return res.status(500).json({ 
          message: 'Failed to generate circom input file',
          error: 'Output file not created'
        });
      }

      // Step 2: Generate witness for zk-SNARK
      console.log('Generating witness...');
      const generateWitnessCmd = `node ${path.join(tempDir, 'mia2_js/generate_witness.js')} ${wasmFile} ${circomInputFile} ${witnessFile}`;
      console.log(`Executing: ${generateWitnessCmd}`);
      
      const { stdout: witnessStdout, stderr: witnessStderr } = await execPromise(generateWitnessCmd);
      
      if (witnessStderr) {
        console.log('Witness generation stderr:', witnessStderr);
      }
      console.log('Witness generation stdout:', witnessStdout);

      // Check if witness.wtns was created
      if (!fs.existsSync(witnessFile)) {
        console.error('witness.wtns was not created');
        return res.status(500).json({ 
          message: 'Failed to generate witness file',
          error: 'Output file not created'
        });
      }

      // Step 3: Export witness to JSON for inspection (optional)
      try {
        console.log('Exporting witness to JSON...');
        const exportWitnessCmd = `snarkjs wtns export json ${witnessFile} ${witnessJsonFile}`;
        console.log(`Executing: ${exportWitnessCmd}`);
        
        const { stdout: exportStdout, stderr: exportStderr } = await execPromise(exportWitnessCmd);
        
        if (exportStderr) {
          console.log('Witness export stderr:', exportStderr);
        }
        console.log('Witness export stdout:', exportStdout);
      } catch (exportError) {
        console.error('Witness export error (continuing):', exportError);
        // Continue anyway as this step is optional
      }

      // Step 4: Generate proof
      console.log('Generating proof...');
      const generateProofCmd = `snarkjs groth16 prove ${zkeyFile} ${witnessFile} ${proofFile} ${publicFile}`;
      console.log(`Executing: ${generateProofCmd}`);
      
      const { stdout: proofStdout, stderr: proofStderr } = await execPromise(generateProofCmd);
      
      if (proofStderr) {
        console.log('Proof generation stderr:', proofStderr);
      }
      console.log('Proof generation stdout:', proofStdout);

      // Check if proof.json and public.json were created
      if (!fs.existsSync(proofFile) || !fs.existsSync(publicFile)) {
        console.error('Proof or public input files were not created');
        return res.status(500).json({ 
          message: 'Failed to generate proof',
          error: 'Output files not created'
        });
      }

      // Step 5: Read the proof and public files
      console.log('Reading proof and public input files...');
      const proof = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
      const publicInputs = JSON.parse(fs.readFileSync(publicFile, 'utf8'));

      console.log('Verification completed successfully');
      // Return the verification result
      return res.status(200).json({
        message: 'Verification completed',
        matchFound: publicInputs[1] === '1',
        proof,
        publicInputs
      });
    } catch (cmdError) {
      console.error('Command execution error:', cmdError);
      return res.status(500).json({ 
        message: 'Verification process failed', 
        error: cmdError.message,
        step: cmdError.step || 'unknown'
      });
    }
  } catch (error) {
    console.error('Verification process error:', error);
    res.status(500).json({ message: 'An error occurred during verification', error: error.message });
  }
});

// Submit generated proof and public files to be archived
router.post('/submit-proof', auth, restrictPolice, async (req, res) => {
  try {
    const { proofPath, publicPath } = req.body;
    
    console.log('Proof submission request received from user:', req.user.id);
    
    if (!proofPath || !publicPath) {
      return res.status(400).json({ message: 'Both proof and public file paths are required' });
    }
    
    // Check if files exist
    if (!fs.existsSync(proofPath)) {
      return res.status(400).json({ message: `Proof file not found: ${proofPath}` });
    }
    
    if (!fs.existsSync(publicPath)) {
      return res.status(400).json({ message: `Public file not found: ${publicPath}` });
    }
    
    // Read the files
    const proofData = fs.readFileSync(proofPath, 'utf8');
    const publicData = fs.readFileSync(publicPath, 'utf8');
    
    // Get user information
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create new proof submission in database
    const submission = new ProofSubmission({
      userId: req.user.id,
      userName: user.name,
      proofData,
      publicData
    });
    
    await submission.save();
    
    console.log(`Proof submission saved with ID: ${submission._id}`);
    
    res.status(201).json({
      message: 'Proof submitted successfully',
      submissionId: submission._id,
      timestamp: submission.timestamp
    });
  } catch (error) {
    console.error('Proof submission error:', error);
    res.status(500).json({ message: 'An error occurred during proof submission', error: error.message });
  }
});

// Get all proof submissions (police only)
router.get('/proof-submissions', auth, onlyPolice, async (req, res) => {
  try {
    const submissions = await ProofSubmission.find()
      .sort({ timestamp: -1 })
      .select('-proofData -publicData'); // Exclude large data fields
    
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching proof submissions:', error);
    res.status(500).json({ message: 'Failed to fetch proof submissions', error: error.message });
  }
});

// Get a specific proof submission with full data (police only)
router.get('/proof-submissions/:id', auth, onlyPolice, async (req, res) => {
  try {
    const submission = await ProofSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Proof submission not found' });
    }
    
    res.json(submission);
  } catch (error) {
    console.error('Error fetching proof submission:', error);
    res.status(500).json({ message: 'Failed to fetch proof submission', error: error.message });
  }
});

// Download proof file from a submission (police only)
router.get('/proof-submissions/:id/proof', auth, onlyPolice, async (req, res) => {
  try {
    const submission = await ProofSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Proof submission not found' });
    }
    
    // Create a temporary file to send
    const tempFilePath = path.join(tempDir, `proof-${submission._id}.json`);
    fs.writeFileSync(tempFilePath, submission.proofData);
    
    res.download(tempFilePath, `proof-${submission._id}.json`, (err) => {
      // Delete the temp file after download
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading proof file:', error);
    res.status(500).json({ message: 'Failed to download proof file', error: error.message });
  }
});

// Download public file from a submission (police only)
router.get('/proof-submissions/:id/public', auth, onlyPolice, async (req, res) => {
  try {
    const submission = await ProofSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Proof submission not found' });
    }
    
    // Create a temporary file to send
    const tempFilePath = path.join(tempDir, `public-${submission._id}.json`);
    fs.writeFileSync(tempFilePath, submission.publicData);
    
    res.download(tempFilePath, `public-${submission._id}.json`, (err) => {
      // Delete the temp file after download
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Error downloading public file:', error);
    res.status(500).json({ message: 'Failed to download public file', error: error.message });
  }
});

// Update the status of a proof submission (police only)
router.put('/proof-submissions/:id/status', auth, onlyPolice, async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;
    
    if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const submission = await ProofSubmission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ message: 'Proof submission not found' });
    }
    
    submission.status = status;
    if (verificationNotes) {
      submission.verificationNotes = verificationNotes;
    }
    
    await submission.save();
    
    res.json({
      message: 'Proof submission status updated',
      submission: {
        id: submission._id,
        status: submission.status,
        verificationNotes: submission.verificationNotes
      }
    });
  } catch (error) {
    console.error('Error updating proof submission status:', error);
    res.status(500).json({ message: 'Failed to update submission status', error: error.message });
  }
});

module.exports = router;