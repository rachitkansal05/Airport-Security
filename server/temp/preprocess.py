import cv2
import numpy as np
import pickle
import sys

class FeatureExtractor:
    def __init__(self):
        # Optimized ORB parameters
        self.orb = cv2.ORB_create(nfeatures=2000, 
                                scaleFactor=1.2,
                                nlevels=8,
                                edgeThreshold=31,
                                patchSize=31)
    
    def preprocess(self, img):
        """Enhanced preprocessing pipeline"""
        # Normalization
        img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX)
        
        # CLAHE for contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(16,16))
        enhanced = clahe.apply(img)
        
        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(enhanced, 255, 
                                     cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                     cv2.THRESH_BINARY_INV, 21, 2)
        
        # Noise removal
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3,3))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=2)
        return cleaned

    def extract(self, img_path):
        """Extract features with comprehensive error handling"""
        try:
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is None:
                print(f"Error: Could not read image {img_path}")
                return None
            
            processed = self.preprocess(img)
            kp, des = self.orb.detectAndCompute(processed, None)
            
            if des is None or len(des) < 10:
                print("Warning: Few features - trying fallback")
                kp, des = self.orb.detectAndCompute(img, None)
                if des is None:
                    return None
            
            # Serialize features
            features = {
                'keypoints': [(kp.pt, kp.size, kp.angle, kp.response, kp.octave, kp.class_id) 
                            for kp in kp],
                'descriptors': des.tolist(),
                'image_shape': img.shape
            }
            return features
            
        except Exception as e:
            print(f"Error processing {img_path}: {str(e)}")
            return None

    def save_features(self, features, output_file):
        """Save features to file"""
        with open(output_file, 'wb') as f:
            pickle.dump(features, f)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python feature_extractor.py image_path output.pkl")
        sys.exit(1)

    extractor = FeatureExtractor()
    features = extractor.extract(sys.argv[1])
    
    if features:
        extractor.save_features(features, sys.argv[2])
        print(f"✅ Success! Features saved to {sys.argv[2]}")
        print(f"Keypoints found: {len(features['keypoints'])}")
    else:
        print("❌ Failed to extract features")
        sys.exit(1)
