import cv2
import numpy as np
import pickle
import sys
import json
import os

class KNNFingerprintMatcher:
    def __init__(self):
        # KNN matching parameters
        self.min_matches = 10          # Reduced minimum matches
        self.lowes_ratio = 0.70        # More lenient ratio
        self.knn_k = 2                 # Standard KNN with k=2
        
        # Feature matcher configuration
        self.matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
        
        # Score calculation weights (fixed-point representation scaled by 100)
        self.distance_weight = 40      # 0.4 * 100
        self.count_weight = 60         # 0.6 * 100

    def load_features(self, feature_file):
        """Load features from file"""
        try:
            print(f"Loading features from: {feature_file}")
            with open(feature_file, 'rb') as f:
                data = pickle.load(f)
                if not all(key in data for key in ['keypoints', 'descriptors']):
                    raise ValueError("Invalid feature file format")
                print(f"Successfully loaded features with {len(data['keypoints'])} keypoints")
                return data
        except Exception as e:
            print(f"Error loading features: {str(e)}")
            sys.exit(1)

    def match(self, features1, features2):
        """Simplified KNN-only matching with fixed-point output"""
        try:
            # Convert descriptors to numpy arrays
            des1 = np.array(features1['descriptors'], dtype=np.uint8)
            des2 = np.array(features2['descriptors'], dtype=np.uint8)

            print(f"Descriptor shapes: {des1.shape}, {des2.shape}")

            # Early termination if not enough descriptors
            if len(des1) < self.knn_k or len(des2) < self.knn_k:
                print(f"Not enough descriptors: {len(des1)}, {len(des2)}")
                return False, 0, 0, [], []

            # Perform KNN matching
            knn_matches = self.matcher.knnMatch(des1, des2, k=self.knn_k)
            print(f"Found {len(knn_matches)} potential matches")

            # Apply ratio test and collect distances
            good_matches = []
            match_distances = []
            for m, n in knn_matches:
                match_distances.append([m.distance, n.distance])
                if m.distance < self.lowes_ratio * n.distance:
                    good_matches.append(m)

            num_good = len(good_matches)
            print(f"Good matches after ratio test: {num_good}")
            
            # Fixed-point scoring (scaled by 100)
            if num_good > 0:
                avg_distance = np.mean([m.distance for m in good_matches])
                normalized_quality = int(round((1 - (avg_distance / 256)) * 100))
                count_score = int(round(min(100, num_good / 30 * 100)))
                final_score = (self.distance_weight * normalized_quality + 
                             self.count_weight * count_score) // 100
                print(f"Avg distance: {avg_distance}, Normalized quality: {normalized_quality}")
                print(f"Count score: {count_score}, Final score: {final_score}")
            else:
                final_score = 0
                print("No good matches, score = 0")

            # Match decision
            is_match = num_good >= self.min_matches
            print(f"Match decision: {is_match} (threshold: {self.min_matches})")

            return is_match, final_score, num_good, good_matches, match_distances
            
        except Exception as e:
            print(f"Matching error: {str(e)}")
            return False, 0, 0, [], []

    def generate_circom_input(self, features1, features2):
        """Generate JSON input for Circom circuit"""
        is_match, final_score, num_matches, good_matches, match_distances = self.match(features1, features2)
        
        # Calculate intermediate values
        avg_distance = np.mean([m.distance for m in good_matches]) if num_matches > 0 else 256
        normalized_quality = int(round((1 - (avg_distance / 256)) * 100))
        count_score = int(round(min(100, num_matches / 30 * 100)))

        # Flatten and pad distances
        flattened_distances = []
        for pair in match_distances:
            flattened_distances.extend(pair)
        
        MAX_PAIRS = 100
        while len(flattened_distances) < 2 * MAX_PAIRS:
            flattened_distances.extend([256, 256])  # Pad with invalid pairs

        # Create input JSON - IMPORTANT: Keys must EXACTLY match what's in the circuit
        # Note the typo in "normalized_qualit" - this must match what's in mia2.circom
        circom_data = {
            "normalized_qualit": normalized_quality,  # Must match the circuit declaration (typo and all)
            "count_score": count_score,
            "distance_weight": self.distance_weight,
            "count_weight": self.count_weight,
            "threshold": 70,
            "lowes_ratio": 7000, 
            "min_matches": self.min_matches,
            "distances": flattened_distances[:2*MAX_PAIRS]  # Exactly 200 elements
        }

        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(script_dir, 'circom_input.json')
        
        with open(output_path, 'w') as f:
            json.dump(circom_data, f, indent=2)
        
        print(f"Saved circom_input.json to: {output_path}")
        
        # Print diagnostics separately
        print("\nDiagnostics (not in circuit input):")
        print(f"Average distance: {avg_distance:.2f}")
        print(f"Good matches: {num_matches}/{len(match_distances)}")
        print(f"Final score: {final_score}/100")
        print(f"Match: {'YES' if is_match else 'NO'}")
        
        return circom_data

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python app2.py features1.pkl features2.pkl")
        sys.exit(1)

    matcher = KNNFingerprintMatcher()
    
    try:
        print(f"Arguments: {sys.argv}")
        features1 = matcher.load_features(sys.argv[1])
        features2 = matcher.load_features(sys.argv[2])
        
        # Generate Circom input
        circom_input = matcher.generate_circom_input(features1, features2)
        print("\nCircom input JSON (saved to circom_input.json):")
        print(json.dumps(circom_input, indent=2))
        
        # Human-readable output
        is_match, score, num_matches, _, _ = matcher.match(features1, features2)
        print("\n=== Final Result ===")
        if is_match:
            print(f"✅ MATCH: Same fingerprint (score: {score}/100)")
        else:
            print(f"❌ NO MATCH: Different fingerprints")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
