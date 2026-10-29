import { Sheet } from "../../components/Sheet";
import { Icon, type IconName } from "../../components/Icon";
import { pickAndImport } from "../import/importer";
import { platform } from "../../lib/platform";
import { useLibraryUi } from "./state";
import "./AddSheet.css";

export function AddSheet() {
  const { addOpen, setAddOpen, setPhysicalOpen } = useLibraryUi();
  const close = () => setAddOpen(false);

  const options: { icon: IconName; title: string; text: string; run: () => void; hidden?: boolean }[] = [
    {
      icon: "file",
      title: "Arquivos de livro",
      text: "EPUB, MOBI, AZW3 ou PDF. Pode escolher vários de uma vez.",
      run: () => pickAndImport(),
    },
    {
      icon: "folder",
      title: "Uma pasta inteira",
      text: "Tudo o que estiver dentro dela, incluindo subpastas.",
      run: () => pickAndImport(true),
      hidden: platform === "android" || platform === "ios",
    },
    {
      icon: "barcode",
      title: "Livro físico",
      text: platform === "android" ? "Código de barras, busca ou cadastro à mão." : "Busca por título, autor ou ISBN.",
      run: () => setTimeout(() => setPhysicalOpen(true), 280),
    },
  ];

  return (
    <Sheet open={addOpen} onClose={close} label="Adicionar livros">
      <p className="reading-form-eyebrow">Adicionar à estante</p>
      <h2 className="reading-form-title">De onde vem o livro?</h2>
      <div className="add-options">
        {options
          .filter((o) => !o.hidden)
          .map((o) => (
            <button
              key={o.title}
              className="add-option"
              onClick={() => {
                close();
                o.run();
              }}
            >
              <span className="add-option-icon">
                <Icon name={o.icon} size={22} />
              </span>
              <span className="add-option-body">
                <strong>{o.title}</strong>
                <span>{o.text}</span>
              </span>
              <Icon name="chevron" size={18} className="add-option-chevron" />
            </button>
          ))}
      </div>
    </Sheet>
  );
}
