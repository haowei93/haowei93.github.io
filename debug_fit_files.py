import os
import sys
# Add current directory to sys.path so we can import garmin_fit_sdk if it's installed locally or just use the system one
# assuming garmin_fit_sdk is installed in the environment
from garmin_fit_sdk import Decoder, Stream

folder = "FIT_OUT/QiaoGe"
files = [f for f in os.listdir(folder) if f.endswith(".fit")]
print(f"Scanning {len(files)} files...")

stats = {
    "total": 0,
    "has_distance": 0,
    "zero_distance": 0,
    "missing_distance": 0,
    "sports": {},
    "sub_sports": {},
    "run_zero_dist_files": []
}

for f in files:
    stats["total"] += 1
    path = os.path.join(folder, f)
    try:
        stream = Stream.from_file(path)
        decoder = Decoder(stream)
        messages, errors = decoder.read(convert_datetimes_to_dates=False)
        
        session = messages.get("session_mesgs", [{}])[0]
        sport = session.get("sport", "unknown")
        sub_sport = session.get("sub_sport", "unknown")
        dist = session.get("total_distance")
        
        # Count sports
        stats["sports"][sport] = stats["sports"].get(sport, 0) + 1
        stats["sub_sports"][sub_sport] = stats["sub_sports"].get(sub_sport, 0) + 1
        
        # Check distance
        if dist is None:
            stats["missing_distance"] += 1
        elif dist > 0.0:
            stats["has_distance"] += 1
        else:
            stats["zero_distance"] += 1
            if sport == 'running':
                stats["run_zero_dist_files"].append(f)
            
    except Exception as e:
        pass # print(f"Error reading {f}: {e}")

print("--- Report ---")
print(f"Total: {stats['total']}")
print(f"With Distance (>0): {stats['has_distance']}")
print(f"Zero Distance: {stats['zero_distance']}")
print(f"Missing Distance: {stats['missing_distance']}")
print("Sports Breakdown:")
for s, c in stats["sports"].items():
    print(f"  {s}: {c}")
print("Sub-Sports Breakdown:")
for s, c in stats["sub_sports"].items():
    print(f"  {s}: {c}")

if stats["run_zero_dist_files"]:
    print(f"\nFound {len(stats['run_zero_dist_files'])} 'running' files with 0 distance.")
    print(f"Example: {stats['run_zero_dist_files'][0]}")
