import { db } from "./db";

export function setupNoteEditor({
  noteNameElement,
  noteBodyElement,
  saveElement,
}: {
  noteNameElement: HTMLInputElement;
  noteBodyElement: HTMLInputElement;
  saveElement: HTMLButtonElement;
}) {
  let noteName: string;
  let noteBody: string;

  const resetForm = () => {
    noteNameElement.value = "";
    noteBodyElement.value = "";
  };

  const saveNote = async (name: string, body: string) => {
    const db$ = await db();
    await db$.notes
      .insert({
        name,
        body,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      })
      .then(resetForm);
  };

  saveElement.addEventListener("click", () => {
    noteName = noteNameElement.value;
    noteBody = noteBodyElement.value;
    if (noteName.length > 0 && noteBody.length > 0) {
      saveNote(noteName, noteBody);
    } else {
      alert("Please fill all the fields");
    }
  });
  
}
