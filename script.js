const NoteX = {
    State: {
        Data: JSON.parse(localStorage.getItem('NoteX_DB')) || {
            Folders: [
                { id: 'root', name: 'General Space', collapsed: false }
            ],
            Notes: []
        },
        ActiveNoteId: null,
        SelectedFolderId: 'root',
        Theme: localStorage.getItem('NoteX_Theme') || 'dark'
    },

    Init() {
        this.CacheDOM();
        this.BindEvents();
        this.RenderSidebar();
        this.ApplyTheme();
    },

    CacheDOM() {
        this.DOM = {
            Tree: document.getElementById('FileTree'),
            Title: document.getElementById('NoteTitle'),
            Input: document.getElementById('MarkdownInput'),
            Preview: document.getElementById('MarkdownPreview'),
            Editor: document.getElementById('EditorWrapper'),
            Empty: document.getElementById('EmptyState'),
            Search: document.getElementById('InputSearch'),
            Tabs: document.querySelectorAll('.TabBtn'),
            Breadcrumbs: document.getElementById('Breadcrumbs'),
            BtnDelFolder: document.getElementById('BtnDeleteFolder')
        };
    },

    Save() {
        localStorage.setItem('NoteX_DB', JSON.stringify(this.State.Data));
    },

    ApplyTheme() {
        document.documentElement.setAttribute('data-theme', this.State.Theme);
        localStorage.setItem('NoteX_Theme', this.State.Theme);
    },

    ParseMarkdown(Text) {
        if (!Text) return '';
        return Text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/\n/gim, '<br>');
    },

    RenderSidebar(Query = '') {
        this.DOM.Tree.innerHTML = '';

        this.State.Data.Folders.forEach(Folder => {
            const FolderEl = document.createElement('div');
            FolderEl.className = `TreeItem FolderItem ${this.State.SelectedFolderId === Folder.id ? 'SelectedFolder' : ''}`;

            FolderEl.innerHTML = `
                <span class="FolderChevron ${Folder.collapsed ? 'Closed' : ''}">
                    ${Folder.collapsed ? '▶' : '▼'}
                </span>  ${Folder.name}
            `;

            FolderEl.onclick = () => {
                if (this.State.SelectedFolderId === Folder.id) {
                    Folder.collapsed = !Folder.collapsed;
                }
                this.State.SelectedFolderId = Folder.id;
                this.UpdateHeaderButtons();
                this.Save();
                this.RenderSidebar(Query);
            };

            FolderEl.ondragover = e => e.preventDefault();
            FolderEl.ondrop = e => this.HandleDrop(e, Folder.id);

            this.DOM.Tree.appendChild(FolderEl);

            if (!Folder.collapsed) {
                this.State.Data.Notes
                    .filter(Note =>
                        Note.folderId === Folder.id &&
                        (
                            Note.title.toLowerCase().includes(Query.toLowerCase()) ||
                            Note.content.toLowerCase().includes(Query.toLowerCase())
                        )
                    )
                    .forEach(Note => {
                        const NoteEl = document.createElement('div');
                        NoteEl.className = `TreeItem NoteIndent ${this.State.ActiveNoteId === Note.id ? 'Active' : ''}`;
                        NoteEl.innerHTML = `🗈${Note.title || 'Untitled Note'}`;
                        NoteEl.draggable = true;

                        NoteEl.onclick = e => {
                            e.stopPropagation();
                            this.OpenNote(Note.id);
                        };

                        NoteEl.ondragstart = e => {
                            e.dataTransfer.setData('text/plain', Note.id);
                        };

                        this.DOM.Tree.appendChild(NoteEl);
                    });
            }
        });
    },

    UpdateHeaderButtons() {
        if (this.State.SelectedFolderId !== 'root' && !this.State.ActiveNoteId) {
            this.DOM.Empty.classList.add('Hidden');
            this.DOM.Editor.classList.remove('Hidden');
            this.DOM.Title.classList.add('Hidden');
            this.DOM.Input.classList.add('Hidden');
            document.querySelector('.ViewTabs').classList.add('Hidden');
            this.DOM.BtnDelFolder.classList.remove('Hidden');
            const Folder = this.State.Data.Folders.find(f => f.id === this.State.SelectedFolderId);
            this.DOM.Breadcrumbs.innerText = `Folder: ${Folder.name}`;
        } else if (this.State.ActiveNoteId) {
            this.DOM.BtnDelFolder.classList.add('Hidden');
            this.DOM.Title.classList.remove('Hidden');
            this.DOM.Input.classList.remove('Hidden');
            document.querySelector('.ViewTabs').classList.remove('Hidden');
        }
    },

    OpenNote(Id) {
        const Note = this.State.Data.Notes.find(n => n.id === Id);
        if (!Note) return;

        this.State.ActiveNoteId = Id;
        this.State.SelectedFolderId = Note.folderId;

        this.DOM.Empty.classList.add('Hidden');
        this.DOM.Editor.classList.remove('Hidden');
        this.DOM.BtnDelFolder.classList.add('Hidden');

        this.DOM.Title.classList.remove('Hidden');
        this.DOM.Input.classList.remove('Hidden');
        document.querySelector('.ViewTabs').classList.remove('Hidden');

        this.DOM.Title.value = Note.title;
        this.DOM.Input.value = Note.content;
        this.DOM.Breadcrumbs.innerText = 'Workspace / Note';

        this.RenderSidebar();
        this.SwitchTab('MarkdownInput');
    },

    SwitchTab(TargetId) {
        this.DOM.Tabs.forEach(Btn => {
            Btn.classList.toggle('Active', Btn.dataset.target === TargetId);
        });

        if (TargetId === 'MarkdownPreview') {
            this.DOM.Preview.innerHTML = this.ParseMarkdown(this.DOM.Input.value);
            this.DOM.Preview.classList.remove('Hidden');
            this.DOM.Input.classList.add('Hidden');
        } else {
            this.DOM.Preview.classList.add('Hidden');
            this.DOM.Input.classList.remove('Hidden');
            this.DOM.Input.focus();
        }
    },

    HandleDrop(Event, FolderId) {
        const NoteId = Event.dataTransfer.getData('text/plain');
        const Note = this.State.Data.Notes.find(n => n.id === NoteId);
        if (Note) {
            Note.folderId = FolderId;
            this.Save();
            this.RenderSidebar();
        }
    },

    DeleteFolder() {
        if (!confirm('Delete folder? Notes will move to General Space.')) return;

        this.State.Data.Notes.forEach(Note => {
            if (Note.folderId === this.State.SelectedFolderId) {
                Note.folderId = 'root';
            }
        });

        this.State.Data.Folders = this.State.Data.Folders.filter(
            Folder => Folder.id !== this.State.SelectedFolderId
        );

        this.State.SelectedFolderId = 'root';
        this.State.ActiveNoteId = null;

        this.Save();
        this.DOM.Editor.classList.add('Hidden');
        this.DOM.Empty.classList.remove('Hidden');
        this.RenderSidebar();
    },

    BindEvents() {
        document.getElementById('BtnNewNote').onclick = () => {
            const Id = 'n' + Date.now();
            this.State.Data.Notes.push({
                id: Id,
                title: '',
                content: '',
                folderId: this.State.SelectedFolderId
            });
            this.Save();
            this.OpenNote(Id);
        };

        document.getElementById('BtnNewFolder').onclick = () => {
            const Name = prompt('Folder Name:');
            if (!Name) return;

            const Id = 'f' + Date.now();
            this.State.Data.Folders.push({
                id: Id,
                name: Name,
                collapsed: false
            });

            this.State.SelectedFolderId = Id;
            this.Save();
            this.RenderSidebar();
        };

        this.DOM.Title.oninput = e => {
            const Note = this.State.Data.Notes.find(n => n.id === this.State.ActiveNoteId);
            if (Note) {
                Note.title = e.target.value;
                this.Save();
                this.RenderSidebar();
            }
        };

        this.DOM.Input.oninput = e => {
            const Note = this.State.Data.Notes.find(n => n.id === this.State.ActiveNoteId);
            if (Note) {
                Note.content = e.target.value;
                this.Save();
            }
        };

        this.DOM.Search.oninput = e => {
            this.RenderSidebar(e.target.value);
        };

        this.DOM.Tabs.forEach(Btn => {
            Btn.onclick = () => this.SwitchTab(Btn.dataset.target);
        });

        document.getElementById('BtnThemeToggle').onclick = () => {
            this.State.Theme = this.State.Theme === 'light' ? 'dark' : 'light';
            this.ApplyTheme();
        };

        document.getElementById('BtnDeleteNote').onclick = () => {
            if (!confirm('Delete note?')) return;

            this.State.Data.Notes = this.State.Data.Notes.filter(
                Note => Note.id !== this.State.ActiveNoteId
            );

            this.State.ActiveNoteId = null;
            this.Save();

            this.DOM.Editor.classList.add('Hidden');
            this.DOM.Empty.classList.remove('Hidden');
            this.RenderSidebar();
        };

        this.DOM.BtnDelFolder.onclick = () => this.DeleteFolder();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NoteX.Init();
});
