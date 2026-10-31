import { Info } from '../components/icons'
import './checkout.css'

export default function CheckoutNotice() {
  return (
    <p className="checkout-notice" role="note">
      <Info size={16} aria-hidden="true" />
      <span>
        <strong>Transação isenta de cobrança:</strong> este ambiente acadêmico registra o pedido e libera o acesso na biblioteca digital sem processamento financeiro.
      </span>
    </p>
  )
}
