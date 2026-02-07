import argparse
import json

from utils import make_activities_file


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--db", required=True)
    parser.add_argument("--json", required=True)
    parser.add_argument("--file-suffix", default="fit", choices=["fit", "gpx", "tcx"])
    args = parser.parse_args()

    make_activities_file(args.db, args.data_dir, args.json, args.file_suffix)


if __name__ == "__main__":
    main()
