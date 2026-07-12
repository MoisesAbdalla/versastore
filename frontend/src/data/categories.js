import masculinoImg from "../assets/categories/masculino.png";
import femininoImg from "../assets/categories/feminino.png";
import calcadosImg from "../assets/categories/calcados.png";
import acessoriosImg from "../assets/categories/acessorios.png";

// `key` é o identificador estável usado pelo doc settings/home (feature 004)
// para sobrepor a imagem padrão de cada categoria pela tela Aparência do admin.
const categories = [
  {
    id: 1,
    key: "masculino",
    name: "Masculino",
    image: masculinoImg,
    imageAlt: "Coleção masculina Versa Store",
  },
  {
    id: 2,
    key: "feminino",
    name: "Feminino",
    image: femininoImg,
    imageAlt: "Coleção feminina Versa Store",
  },
  {
    id: 3,
    key: "calcados",
    name: "Calçados",
    image: calcadosImg,
    imageAlt: "Coleção de calçados Versa Store",
  },
  {
    id: 4,
    key: "acessorios",
    name: "Acessórios",
    image: acessoriosImg,
    imageAlt: "Coleção de acessórios Versa Store",
  },
];

export default categories;
