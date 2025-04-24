pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
template RatioTestSingle() {
    signal input distance1;
    signal input distance2;
    signal input lowes_ratio;
    
    // Alternative ratio test that doesn't require division
    // Check if distance1 * 10000 < distance2 * lowes_ratio * 100
    signal lhs <== distance1 * 10000;
    signal rhs <== distance2 * lowes_ratio * 100;
    
    component lt = LessThan(64);  // Need larger bit width
    lt.in[0] <== lhs;
    lt.in[1] <== rhs;
    
    signal output is_valid <== 1 - lt.out;
}
template Main(n) {
    // Input signals (must match JSON exactly)
    signal input normalized_qualit;
    signal input count_score;
    signal input distance_weight;
    signal input count_weight;
    signal input threshold;
    signal input lowes_ratio;
    signal input min_matches;
    signal input distances[2*n];
    
    // Process each pair
    component ratioTests[n];
    signal valid_matches[n];
    
    for (var i = 0; i < n; i++) {
        ratioTests[i] = RatioTestSingle();
        ratioTests[i].distance1 <== distances[2*i];
        ratioTests[i].distance2 <== distances[2*i + 1];
        ratioTests[i].lowes_ratio <== lowes_ratio;
        valid_matches[i] <== ratioTests[i].is_valid;
    }
    
    // Sum valid matches
    signal partial_sums[n+1];
    partial_sums[0] <== 0;
    for (var i = 0; i < n; i++) {
        partial_sums[i+1] <== partial_sums[i] + valid_matches[i];
    }
    signal match_sum <== partial_sums[n];
    
    // Verify minimum matches
    component lt_min = LessThan(32);
    lt_min.in[0] <== min_matches;
    lt_min.in[1] <== match_sum;
    signal enough_matches <== 1 - lt_min.out;
    
    // Scoring system
    signal quality_term <== distance_weight * normalized_qualit;
    signal count_term <== count_weight * count_score;
    signal final_score_scaled <== (quality_term + count_term);
    
    component lt_score = LessThan(32);
    lt_score.in[0] <== final_score_scaled;
    lt_score.in[1] <== threshold * 100;
    signal good_score <== 1 - lt_score.out;
    
    // Final output
    signal output is_match <== enough_matches * good_score;
}

component main = Main(100);
