#!/usr/bin/env python3
"""Task Tools - 任务管理CLI工具"""
import argparse
import json
import os
from datetime import datetime
from typing import List, Dict, Optional


def _load_tasks(tasks_file: str = "data/tasks.json") -> List[Dict]:
    """Load tasks from file"""
    try:
        if os.path.exists(tasks_file):
            with open(tasks_file, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _save_tasks(tasks: List[Dict], tasks_file: str = "data/tasks.json") -> None:
    """Save tasks to file"""
    os.makedirs(os.path.dirname(tasks_file) or ".", exist_ok=True)
    with open(tasks_file, "w", encoding="utf-8") as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)


def create_task(name: str, deadline: str = "", priority: str = "中",
                estimated_hours: float = 0, notes: str = "",
                tasks_file: str = "data/tasks.json") -> str:
    """Create a new task"""
    try:
        tasks = _load_tasks(tasks_file)
        task = {
            "id": max([t.get("id", 0) for t in tasks], default=0) + 1,
            "name": name,
            "deadline": deadline,
            "priority": priority,
            "estimated_hours": estimated_hours,
            "notes": notes,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        tasks.append(task)
        _save_tasks(tasks, tasks_file)
        return f"✅ 任务创建成功！\n[{task['id']}] {task['name']}\n📅 截止: {task['deadline'] or '未设置'}\n⭐ 优先级: {task['priority']}"
    except Exception as e:
        return f"❌ 创建失败: {e}"


def list_tasks(status_filter: str = "all", tasks_file: str = "data/tasks.json") -> str:
    """List tasks"""
    tasks = _load_tasks(tasks_file)
    if not tasks:
        return "📋 暂无任务"

    status_map = {"pending": "⏳ 待处理", "in_progress": "🔄 进行中", "completed": "✅ 已完成"}
    priority_map = {"高": "🔴", "中": "🟡", "低": "🟢"}

    filtered = tasks if status_filter == "all" else [t for t in tasks if t.get("status") == status_filter]
    if not filtered:
        return f"没有 {status_filter} 的任务"

    output = "📋 任务列表\n" + "=" * 40 + "\n\n"
    for task in filtered:
        p = priority_map.get(task.get("priority", "中"), "⚪")
        output += f"[{task['id']}] {task['name']}\n"
        output += f"    {status_map.get(task['status'], task['status'])} | {p} {task.get('priority', '中')}\n"
        output += f"    📅 {task.get('deadline', '无')} | ⏱️ {task.get('estimated_hours', 0)}h\n"
        if task.get("notes"):
            output += f"    📝 {task['notes']}\n"
        output += "\n"
    return output


def update_task(task_id: int, status: str, tasks_file: str = "data/tasks.json") -> str:
    """Update task status"""
    try:
        tasks = _load_tasks(tasks_file)
        for task in tasks:
            if task["id"] == task_id:
                task["status"] = status
                task["updated_at"] = datetime.now().isoformat()
                _save_tasks(tasks, tasks_file)
                status_map = {"pending": "⏳ 待处理", "in_progress": "🔄 进行中", "completed": "✅ 已完成"}
                return f"✅ 任务 [{task_id}] 已更新: {status_map.get(status, status)}"
        return f"❌ 未找到任务 ID: {task_id}"
    except Exception as e:
        return f"❌ 更新失败: {e}"


def delete_task(task_id: int, tasks_file: str = "data/tasks.json") -> str:
    """Delete a task"""
    try:
        tasks = _load_tasks(tasks_file)
        for i, task in enumerate(tasks):
            if task["id"] == task_id:
                removed = tasks.pop(i)
                _save_tasks(tasks, tasks_file)
                return f"🗑️ 已删除: [{task_id}] {removed['name']}"
        return f"❌ 未找到任务 ID: {task_id}"
    except Exception as e:
        return f"❌ 删除失败: {e}"


def generate_report(tasks_file: str = "data/tasks.json") -> str:
    """Generate progress report"""
    tasks = _load_tasks(tasks_file)
    if not tasks:
        return "📊 暂无任务，无法生成报告"

    total = len(tasks)
    completed = len([t for t in tasks if t["status"] == "completed"])
    in_progress = len([t for t in tasks if t["status"] == "in_progress"])
    pending = total - completed - in_progress
    progress = (completed / total * 100) if total > 0 else 0

    return f"""
📊 任务进度报告
{"=" * 40}
生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M")}

📈 统计概览:
• 总任务: {total}
• ✅ 已完成: {completed}
• 🔄 进行中: {in_progress}
• ⏳ 待处理: {pending}
• 📊 完成率: {progress:.1f}%
"""


def main():
    parser = argparse.ArgumentParser(description="Task Tools - 任务管理工具")
    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    # create_task
    create_parser = subparsers.add_parser("create_task", help="创建新任务")
    create_parser.add_argument("--name", required=True, help="任务名称")
    create_parser.add_argument("--deadline", default="", help="截止日期")
    create_parser.add_argument("--priority", default="中", help="优先级（高/中/低）")
    create_parser.add_argument("--hours", type=float, default=0, help="预估小时数")
    create_parser.add_argument("--notes", default="", help="备注")
    create_parser.add_argument("--tasks-file", default="data/tasks.json", help="任务文件路径")

    # list_tasks
    list_parser = subparsers.add_parser("list_tasks", help="列出任务")
    list_parser.add_argument("--status", default="all", help="状态筛选（all/pending/in_progress/completed）")
    list_parser.add_argument("--tasks-file", default="data/tasks.json", help="任务文件路径")

    # update_task
    update_parser = subparsers.add_parser("update_task", help="更新任务状态")
    update_parser.add_argument("--id", type=int, required=True, help="任务ID")
    update_parser.add_argument("--status", required=True, help="新状态（pending/in_progress/completed）")
    update_parser.add_argument("--tasks-file", default="data/tasks.json", help="任务文件路径")

    # delete_task
    delete_parser = subparsers.add_parser("delete_task", help="删除任务")
    delete_parser.add_argument("--id", type=int, required=True, help="任务ID")
    delete_parser.add_argument("--tasks-file", default="data/tasks.json", help="任务文件路径")

    # generate_report
    report_parser = subparsers.add_parser("generate_report", help="生成进度报告")
    report_parser.add_argument("--tasks-file", default="data/tasks.json", help="任务文件路径")

    args = parser.parse_args()

    if args.command == "create_task":
        print(create_task(args.name, args.deadline, args.priority, args.hours, args.notes, args.tasks_file))
    elif args.command == "list_tasks":
        print(list_tasks(args.status, args.tasks_file))
    elif args.command == "update_task":
        print(update_task(args.id, args.status, args.tasks_file))
    elif args.command == "delete_task":
        print(delete_task(args.id, args.tasks_file))
    elif args.command == "generate_report":
        print(generate_report(args.tasks_file))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
