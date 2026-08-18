/**
 * Contract Templates
 * Pre-built templates for common contract types
 */

export const contractTemplates = [
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement (NDA)',
    nameVi: 'Hợp đồng bảo mật',
    category: 'Confidentiality',
    icon: 'shield',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'NON-DISCLOSURE AGREEMENT' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This Non-Disclosure Agreement ("Agreement") is entered into as of ',
          },
          {
            type: 'contractVariable',
            attrs: { label: 'Effective Date', type: 'date', required: true },
          },
          {
            type: 'text',
            text: ' by and between:',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '1. ' },
          {
            type: 'contractVariable',
            attrs: { label: 'Party A Name', type: 'party', required: true },
          },
          { type: 'text', text: ', with its principal office at ' },
          {
            type: 'contractVariable',
            attrs: { label: 'Party A Address', type: 'text', required: true },
          },
          { type: 'text', text: ' ("Disclosing Party"); and' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '2. ' },
          {
            type: 'contractVariable',
            attrs: { label: 'Party B Name', type: 'party', required: true },
          },
          { type: 'text', text: ', with its principal office at ' },
          {
            type: 'contractVariable',
            attrs: { label: 'Party B Address', type: 'text', required: true },
          },
          { type: 'text', text: ' ("Receiving Party").' },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Collectively referred to as the "Parties".' },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Definition of Confidential Information',
          category: 'confidentiality',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '"Confidential Information" means any information disclosed by either Party that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.',
              },
            ],
          },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Obligations of Receiving Party',
          category: 'confidentiality',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'The Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent of the Disclosing Party; and (c) use the Confidential Information solely for the purpose of ',
              },
              {
                type: 'contractVariable',
                attrs: { label: 'Purpose', type: 'text', required: true },
              },
              {
                type: 'text',
                text: '.',
              },
            ],
          },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Term',
          category: 'termination',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This Agreement shall remain in effect for ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Duration', type: 'text', required: true },
              },
              {
                type: 'text',
                text: ' from the Effective Date, unless terminated earlier by either Party upon ',
              },
              {
                type: 'contractVariable',
                attrs: { label: 'Notice Period', type: 'text', required: true },
              },
              {
                type: 'text',
                text: ' written notice to the other Party.',
              },
            ],
          },
        ],
      },
      {
        type: 'signatureBlock',
        attrs: {
          partyName: '',
          partyTitle: 'Authorized Signatory',
          signatureType: 'signature',
        },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '___________________________________________' }],
          },
        ],
      },
    ],
  },
  {
    id: 'service-agreement',
    name: 'Service Agreement',
    nameVi: 'Hợp đồng dịch vụ',
    category: 'Service',
    icon: 'briefcase',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'SERVICE AGREEMENT' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This Service Agreement ("Agreement") is entered into as of ',
          },
          {
            type: 'contractVariable',
            attrs: { label: 'Effective Date', type: 'date', required: true },
          },
          {
            type: 'text',
            text: ' between ',
          },
          {
            type: 'contractVariable',
            attrs: { label: 'Client Name', type: 'party', required: true },
          },
          { type: 'text', text: ' ("Client") and ' },
          {
            type: 'contractVariable',
            attrs: { label: 'Provider Name', type: 'party', required: true },
          },
          { type: 'text', text: ' ("Provider").' },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Scope of Services',
          category: 'general',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'contractVariable',
                attrs: { label: 'Description of Services', type: 'text', required: true },
              },
            ],
          },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Payment Terms',
          category: 'payment',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'The Client shall pay the Provider ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Payment Amount', type: 'money', required: true },
              },
              { type: 'text', text: ' ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Payment Frequency', type: 'text', required: true },
              },
              {
                type: 'text',
                text: '. Payment shall be due within ',
              },
              {
                type: 'contractVariable',
                attrs: { label: 'Payment Due Days', type: 'number', required: true },
              },
              { type: 'text', text: ' days of invoice.' },
            ],
          },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Term and Termination',
          category: 'termination',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This Agreement shall commence on ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Start Date', type: 'date', required: true },
              },
              { type: 'text', text: ' and continue for ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Contract Term', type: 'text', required: true },
              },
              {
                type: 'text',
                text: ', unless terminated as provided herein.',
              },
            ],
          },
        ],
      },
      {
        type: 'signatureBlock',
        attrs: {
          partyName: '',
          partyTitle: 'Client Representative',
          signatureType: 'signature',
        },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '___________________________________________' }],
          },
        ],
      },
    ],
  },
  {
    id: 'employment',
    name: 'Employment Agreement',
    nameVi: 'Hợp đồng lao động',
    category: 'Employment',
    icon: 'users',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'EMPLOYMENT AGREEMENT' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This Employment Agreement is entered into as of ',
          },
          {
            type: 'contractVariable',
            attrs: { label: 'Start Date', type: 'date', required: true },
          },
          {
            type: 'text',
            text: ' between ',
          },
          {
            type: 'contractVariable',
            attrs: { label: 'Employer Name', type: 'party', required: true },
          },
          { type: 'text', text: ' ("Employer") and ' },
          {
            type: 'contractVariable',
            attrs: { label: 'Employee Name', type: 'party', required: true },
          },
          { type: 'text', text: ' ("Employee").' },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Position and Duties',
          category: 'general',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Employee shall serve as ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Job Title', type: 'text', required: true },
              },
              {
                type: 'text',
                text: ' and shall perform such duties as are customary for such position.',
              },
            ],
          },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Compensation',
          category: 'payment',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Employee shall receive a base salary of ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Salary', type: 'money', required: true },
              },
              { type: 'text', text: ' per ' },
              {
                type: 'contractVariable',
                attrs: { label: 'Pay Period', type: 'text', required: true },
              },
              {
                type: 'text',
                text: ', subject to applicable withholdings and deductions.',
              },
            ],
          },
        ],
      },
      {
        type: 'contractClause',
        attrs: {
          clauseName: 'Confidentiality',
          category: 'confidentiality',
        },
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Employee agrees to maintain the confidentiality of all proprietary information of the Employer during and after employment.',
              },
            ],
          },
        ],
      },
      {
        type: 'signatureBlock',
        attrs: {
          partyName: '',
          partyTitle: 'Employer Representative',
          signatureType: 'signature',
        },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '___________________________________________' }],
          },
        ],
      },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Contract',
    nameVi: 'Hợp đồng trống',
    category: 'Custom',
    icon: 'file-text',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'CONTRACT TITLE' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Enter your contract content here...',
          },
        ],
      },
    ],
  },
]

/**
 * Default clause library for insertion
 */
export const clauseLibrary = [
  {
    id: 'force-majeure',
    name: 'Force Majeure',
    category: 'general',
    content: 'Neither Party shall be liable for any failure or delay in performance under this Agreement due to circumstances beyond its reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.',
  },
  {
    id: 'limitation-liability',
    name: 'Limitation of Liability',
    category: 'liability',
    content: 'IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, HOWEVER CAUSED AND UNDER ANY THEORY OF LIABILITY.',
  },
  {
    id: 'indemnification',
    name: 'Indemnification',
    category: 'liability',
    content: 'Each Party agrees to indemnify, defend, and hold harmless the other Party from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys\' fees) arising out of or resulting from breach of this Agreement by the indemnifying Party.',
  },
  {
    id: 'governing-law',
    name: 'Governing Law',
    category: 'dispute',
    content: 'This Agreement shall be governed by and construed in accordance with the laws of the State of [STATE/COUNTRY], without regard to its conflict of laws principles.',
  },
  {
    id: 'dispute-resolution',
    name: 'Dispute Resolution',
    category: 'dispute',
    content: 'Any dispute arising out of or relating to this Agreement shall first be attempted to be resolved through good faith negotiation. If the Parties are unable to resolve the dispute within thirty (30) days, either Party may submit the dispute to binding arbitration in accordance with the rules of [ARBITRATION BODY].',
  },
  {
    id: 'entire-agreement',
    name: 'Entire Agreement',
    category: 'general',
    content: 'This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral.',
  },
  {
    id: 'severability',
    name: 'Severability',
    category: 'general',
    content: 'If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.',
  },
  {
    id: 'assignment',
    name: 'Assignment',
    category: 'general',
    content: 'Neither Party may assign or transfer this Agreement without the prior written consent of the other Party, except that either Party may assign this Agreement in connection with a merger, acquisition, or sale of all or substantially all of its assets.',
  },
  {
    id: 'notices',
    name: 'Notices',
    category: 'general',
    content: 'All notices required or permitted under this Agreement shall be in writing and shall be deemed delivered when delivered in person, by courier, or by certified mail, return receipt requested, to the addresses set forth above.',
  },
  {
    id: 'waiver',
    name: 'Waiver',
    category: 'general',
    content: 'The failure of either Party to enforce any provision of this Agreement shall not constitute a waiver of such provision or the right to enforce it at a later time.',
  },
]
