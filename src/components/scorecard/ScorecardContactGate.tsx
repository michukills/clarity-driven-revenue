import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Section from "@/components/Section";
import type { ContactInfo } from "@/pages/Scorecard";

interface Props {
  contact: ContactInfo;
  setContact: React.Dispatch<React.SetStateAction<ContactInfo>>;
  onSubmit: () => void;
}

const ScorecardContactGate = ({ contact, setContact, onSubmit }: Props) => {
  const valid =
    contact.firstName.trim() &&
    contact.lastName.trim() &&
    contact.email.trim() &&
    contact.businessName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit();
  };

  const field = (
    key: keyof ContactInfo,
    label: string,
    required: boolean,
    type = "text",
    placeholder = ""
  ) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={contact[key]}
        onChange={(e) => setContact((p) => ({ ...p, [key]: e.target.value }))}
        className="input-field"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      <Section className="pt-32">
        <div className="max-w-lg mx-auto">
          <h2 className="font-display text-3xl font-semibold text-foreground mb-3 text-center leading-[1.1]">
            See Your Score
          </h2>
          <p className="text-muted-foreground text-center mb-10">
            Enter your information to view your RGS Business Scorecard results.
          </p>

          <form onSubmit={handleSubmit} className="premium-card hover:transform-none space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {field("firstName", "First Name", true)}
              {field("lastName", "Last Name", true)}
            </div>
            {field("email", "Email", true, "email", "you@company.com")}
            {field("businessName", "Business Name", true)}
            {field("phone", "Phone Number", false, "tel")}

            <p className="text-xs text-muted-foreground/60 leading-relaxed pt-2">
              By submitting, you agree to be contacted by Revenue &amp; Growth
              Systems regarding your scorecard results and related services.
            </p>

            <button
              type="submit"
              disabled={!valid}
              className={`btn-primary w-full justify-center ${!valid ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              View My Results
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </Section>
    </motion.div>
  );
};

export default ScorecardContactGate;
