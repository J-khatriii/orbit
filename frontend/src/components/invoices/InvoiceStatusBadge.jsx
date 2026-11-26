import { Badge } from "../ui/index.js";
import { STATUS_LABELS, STATUS_TONES, displayStatus } from "../../features/invoices/constants.js";

const InvoiceStatusBadge = ({ invoice }) => {
  const status = displayStatus(invoice);

  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
};

export default InvoiceStatusBadge;
