#!/usr/bin/env python3
"""Dev Tools - 开发助手CLI工具"""
import argparse
import os
import subprocess
from typing import Optional


def write_code(content: str, file: str, work_dir: str = ".") -> str:
    """Write code to file"""
    try:
        filepath = file if os.path.isabs(file) else os.path.join(work_dir, file)
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return f"✅ 已写入: {filepath}"
    except Exception as e:
        return f"❌ 写入失败: {e}"


def run_code(file: str, work_dir: str = ".") -> str:
    """Run Python file"""
    try:
        filepath = file if os.path.isabs(file) else os.path.join(work_dir, file)
        if not os.path.exists(filepath):
            return f"❌ 文件不存在: {filepath}"
        result = subprocess.run(
            ["python3", filepath],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=work_dir
        )
        if result.returncode == 0:
            return f"✅ 运行成功:\n{result.stdout}" if result.stdout else "✅ 运行成功（无输出）"
        return f"❌ 运行失败:\n{result.stderr}"
    except subprocess.TimeoutExpired:
        return "⏱️ 运行超时（30秒）"
    except Exception as e:
        return f"❌ 错误: {e}"


def read_file(file: str, work_dir: str = ".") -> str:
    """Read file content"""
    try:
        filepath = file if os.path.isabs(file) else os.path.join(work_dir, file)
        if not os.path.exists(filepath):
            return f"❌ 文件不存在: {filepath}"
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"❌ 读取失败: {e}"


def list_files(dir_path: str = ".", work_dir: str = ".") -> str:
    """List directory files"""
    try:
        full_path = dir_path if os.path.isabs(dir_path) else os.path.join(work_dir, dir_path)
        if not os.path.exists(full_path):
            return f"❌ 目录不存在: {full_path}"
        items = os.listdir(full_path)
        files = [f for f in items if os.path.isfile(os.path.join(full_path, f))]
        dirs = [d for d in items if os.path.isdir(os.path.join(full_path, d))]
        output = f"📁 {full_path}\n"
        if dirs:
            output += f"📂 目录: {', '.join(dirs)}\n"
        if files:
            output += f"📄 文件: {', '.join(files)}\n"
        return output if items else "(空目录)"
    except Exception as e:
        return f"❌ 列出失败: {e}"


def main():
    parser = argparse.ArgumentParser(description="Dev Tools - 开发助手工具")
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # write_code
    write_parser = subparsers.add_parser("write_code", help="写入代码到文件")
    write_parser.add_argument("--file", required=True, help="目标文件路径")
    write_parser.add_argument("--content", required=True, help="代码内容")
    write_parser.add_argument("--work-dir", default=".", help="工作目录")

    # run_code
    run_parser = subparsers.add_parser("run_code", help="运行Python文件")
    run_parser.add_argument("--file", required=True, help="Python文件路径")
    run_parser.add_argument("--work-dir", default=".", help="工作目录")

    # read_file
    read_parser = subparsers.add_parser("read_file", help="读取文件内容")
    read_parser.add_argument("--file", required=True, help="文件路径")
    read_parser.add_argument("--work-dir", default=".", help="工作目录")

    # list_files
    list_parser = subparsers.add_parser("list_files", help="列出目录文件")
    list_parser.add_argument("--dir", default=".", help="目录路径")
    list_parser.add_argument("--work-dir", default=".", help="工作目录")

    args = parser.parse_args()

    if args.command == "write_code":
        print(write_code(args.content, args.file, args.work_dir))
    elif args.command == "run_code":
        print(run_code(args.file, args.work_dir))
    elif args.command == "read_file":
        print(read_file(args.file, args.work_dir))
    elif args.command == "list_files":
        print(list_files(args.dir, args.work_dir))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
