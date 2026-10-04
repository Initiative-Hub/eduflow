import slide_skills
import inspect

print("=== slide_skills module contents ===")
for name, val in inspect.getmembers(slide_skills):
    if not name.startswith('_'):
        if inspect.isfunction(val) or inspect.isclass(val):
            print(f"{name}: {inspect.signature(val) if inspect.isfunction(val) else 'class'}")
        else:
            print(f"{name}: {type(val)}")
