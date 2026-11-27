import tkinter as tk
from tkinter import filedialog

root = tk.Tk()
root.title('Native Notes — AppDock')
root.geometry('760x520')
root.configure(bg='#142018')
tk.Label(root, text='A real desktop window.', bg='#142018', fg='#cce8b6', font=('Segoe UI', 24)).pack(anchor='w', padx=28, pady=24)
editor = tk.Text(root, bg='#20301c', fg='#e0e8d6', insertbackground='#b8eb65', relief='flat', font=('Segoe UI', 13), padx=18, pady=18)
editor.pack(fill='both', expand=True, padx=28, pady=(0, 16))
editor.insert('1.0', 'This is a native Python / Tk window, launched and managed by AppDock.\n')
def save():
    filename = filedialog.asksaveasfilename(defaultextension='.txt')
    if filename:
        with open(filename, 'w', encoding='utf-8') as handle:
            handle.write(editor.get('1.0', 'end-1c'))
tk.Button(root, text='Save notes', command=save, bg='#b8eb65', fg='#26351d', relief='flat', padx=18, pady=8).pack(anchor='e', padx=28, pady=(0, 22))
root.mainloop()
