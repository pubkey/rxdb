import { db } from "./db";

export async function setupNoteList({
  noteListElement,
}: {
  noteListElement: HTMLUListElement;
}) {
  const getProductsList = async () => {
    const db$ = await db();
    db$.notes
      .find()
      .sort({ updatedAt: "desc" })
      .$.subscribe((notes) => {
        let result = "";
        noteListElement.innerHTML = "";
        notes.forEach((note) => {
          result += `<li> ${note.name} - ${note.body} - ${new Date(note.createdAt).toLocaleDateString('en-US')}</li>`;
        });
        noteListElement.innerHTML = result;
      });
  };
  await getProductsList();
}
