import argparse
import asyncio
import hashlib
import os
import time
import yaml
import shutil

import aiofiles
import httpx

# Re-use existing configuration and utility functions
# Adjust imports if necessary based on your project structure
from config import JSON_FILE, SQL_FILE, FOLDER_DICT
from utils import make_activities_file

# Import the Coros class from the original sync script
# We will subclass or wrap it, or just use the class logic if we can import it
# Assuming coros_sync.py is in the same directory (run_page/)
from coros_sync import Coros, get_downloaded_ids, gather_with_concurrency

def load_users_config(config_path="users.yaml"):
    """Load user configuration from a YAML file."""
    if not os.path.exists(config_path):
        print(f"Config file {config_path} not found.")
        return []
    with open(config_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)
    return config.get("users", [])

async def process_user(user_config, file_type, is_only_running):
    """Process synchronization for a single user."""
    user_name = user_config.get("name")
    coros_conf = user_config.get("coros")

    if not coros_conf:
        print(f"Skipping {user_name}: No Coros configuration found.")
        return

    account = coros_conf.get("account")
    password = coros_conf.get("password")
    
    if not account or not password:
        print(f"Skipping {user_name}: Missing account or password.")
        return

    print(f"--- Starting sync for user: {user_name} ---")

    # Determine user-specific folder
    # We will modify FOLDER_DICT dynamically or create subfolders
    # Original FOLDER_DICT structure: {'fit': 'FIT_OUT', 'gpx': 'GPX_OUT', ...}
    
    # Create a user-specific output directory
    base_folder = FOLDER_DICT[file_type]
    user_folder = os.path.join(base_folder, user_name)
    
    if not os.path.exists(user_folder):
        os.makedirs(user_folder)
        print(f"Created directory: {user_folder}")

    # Prepare credentials
    encrypted_pwd = hashlib.md5(password.encode()).hexdigest()
    
    # Initialize Coros client
    coros = Coros(account, encrypted_pwd, is_only_running=is_only_running)
    
    try:
        await coros.init()
    except Exception as e:
        print(f"Login failed for {user_name}: {e}")
        return

    # Fetch activities
    try:
        activity_infos = await coros.fetch_activity_ids_types(only_run=is_only_running)
        activity_ids = [i[0] for i in activity_infos]
        activity_types = [i[1] for i in activity_infos]
        activity_id_type_dict = dict(zip(activity_ids, activity_types))
        
        print(f"{user_name}: Found {len(activity_ids)} activities.")

        # Check downloaded
        downloaded_ids = get_downloaded_ids(user_folder)
        to_generate_ids = list(set(activity_ids) - set(downloaded_ids))
        print(f"{user_name}: {len(to_generate_ids)} new activities to download.")

        if to_generate_ids:
            start_time = time.time()
            
            # Temporarily monkey-patch FOLDER_DICT or pass folder explicitly if supported
            # Since Coros.download_activity uses global FOLDER_DICT, we need a workaround.
            # Workaround: We temporarily set the global FOLDER_DICT path for this process 
            # OR we modify the download logic.
            # Safer Approach: Modify Coros class in coros_sync.py to accept folder, 
            # OR just subclass it here to override download_activity.
            
            # Let's override the download path logic by subclassing/method replacement logic
            # actually, let's just use the original class but perform a move after download?
            # No, that's racy if we run parallel users.
            # Better: Update FOLDER_DICT locally for this user context if running sequentially.
            
            original_folder = FOLDER_DICT[file_type]
            FOLDER_DICT[file_type] = user_folder # Valid for sequential execution
            
            try:
                await gather_with_concurrency(
                    10,
                    [
                        coros.download_activity(
                            label_id, activity_id_type_dict[label_id], file_type
                        )
                        for label_id in to_generate_ids
                    ],
                )
            finally:
                FOLDER_DICT[file_type] = original_folder # Restore

            print(f"{user_name}: Download finished. Elapsed {time.time()-start_time:.2f}s")
        else:
            print(f"{user_name}: Up to date.")

        await coros.req.aclose()
        
        # --- DB Generation for User ---
        # User-specific data path: /Users/haowei/private/haowei93.github.io/public/data/{user_name}/data.db
        # We need to ensure the parent directory exists.
        
        # Based on Scheme 2 (Independent DBs), we will generate a DB specifically for this user.
        # This allows the frontend to swap databases easily.
        
        public_data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "public", "data", user_name)
        if not os.path.exists(public_data_dir):
            os.makedirs(public_data_dir)
            
        user_db_path = os.path.join(public_data_dir, "data.db")
        user_json_path = os.path.join(public_data_dir, "activities.json") # Optional, if we want static JSON too
        
        print(f"{user_name}: Generating database at {user_db_path}...")
        
        # We call make_activities_file, passing the USER'S DB path and USER'S file folder.
        try:
            make_activities_file(user_db_path, user_folder, user_json_path, file_type)
            print(f"{user_name}: Database generation complete.")
        except Exception as e:
            print(f"{user_name}: Failed to generate database: {e}")
            import traceback
            traceback.print_exc()

    except Exception as e:
        print(f"Error processing {user_name}: {e}")
        await coros.req.aclose()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="users.yaml", help="Path to users config file")
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="if is only for running",
    )
    parser.add_argument(
        "--fit",
        dest="download_file_type",
        action="store_const",
        const="fit",
        default="fit",
        help="download fit files",
    )
    # Add other types if needed (tcx, gpx)
    
    options = parser.parse_args()
    
    users = load_users_config(options.config)
    if not users:
        print("No users found in config.")
        return

    for user in users:
        await process_user(user, options.download_file_type, options.only_run)

if __name__ == "__main__":
    asyncio.run(main())
