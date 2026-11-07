import ComingSoon from "../../ui/ComingSoon";

const ExplainPage = () => (
  <ComingSoon
    eyebrow="Explain"
    title="Treatments, explained in 3D"
    body="Pick a treatment and a language, and watch a narrated walkthrough on the 3D mouth: what happens, step by step, in plain words."
    items={["Filling", "Root canal", "Crown", "Extraction", "Implant"]}
  />
);

export default ExplainPage;
