export async function postGAS(payload) {
  const res = await fetch('/api/gsheet', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export const ClinicaAPI = {
  savePending: (data) => postGAS({ action: 'CLINICA_SAVE_PENDING', ...data }),
  listPending: ()       => postGAS({ action: 'CLINICA_LIST_PENDING' }),
  deletePending: (id)   => postGAS({ action: 'CLINICA_DELETE_PENDING', id }),
  closeCase: (form)     => postGAS({ action: 'CLINICA_CLOSE', data: form })
};
