#!/usr/bin/env bash
# Reassemble the two large RandomForest models from their <100MB split parts.
# GitHub rejects single files >100MB, so crop_model.pkl and fert_model.pkl are
# committed as crop_model.pkl.part-* / fert_model.pkl.part-*. After cloning, run:
#
#   bash backend/app/ml/weights/assemble_models.sh
#
set -e
cd "$(dirname "$0")"

for m in crop_model fert_model; do
  if ls "${m}.pkl.part-"* >/dev/null 2>&1; then
    cat "${m}.pkl.part-"* > "${m}.pkl"
    echo "assembled ${m}.pkl ($(du -h "${m}.pkl" | cut -f1))"
  else
    echo "WARN: no parts found for ${m}.pkl"
  fi
done
