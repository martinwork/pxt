import { useContext, useMemo, useState } from "react";
import { AppStateContext } from "../state/appStateContext";
import { addCriteriaToChecklist } from "../transforms/addCriteriaToChecklist";
import { CatalogCriteria } from "../types/criteria";
import { getCatalogCriteria } from "../state/helpers";
import { ReadOnlyCriteriaDisplay } from "./ReadonlyCriteriaDisplay";
import { Strings } from "../constants";
import { Button } from "react-common/components/controls/Button";
import { getReadableCriteriaTemplate, makeToast } from "../utils";
import { setCatalogOpen } from "../transforms/setCatalogOpen";
import { classList } from "react-common/components/util";
import { announceToScreenReader } from "../transforms/announceToScreenReader";
import { FocusTrap } from "react-common/components/controls/FocusTrap";
import css from "./styling/CatalogOverlay.module.scss";

interface CatalogHeaderProps {
    onClose: () => void;
}
const CatalogHeader: React.FC<CatalogHeaderProps> = ({ onClose }) => {
    return (
        <div className={css["header"]}>
            <span className={css["title"]}>{Strings.SelectCriteriaDescription}</span>
            <Button
                className={css["close-button"]}
                rightIcon="fas fa-times-circle"
                onClick={onClose}
                title={Strings.Close}
            />
        </div>
    );
};

interface CatalogItemLabelProps {
    catalogCriteria: CatalogCriteria;
    isMaxed: boolean;
    recentlyAdded: boolean;
}
const CatalogItemLabel: React.FC<CatalogItemLabelProps> = ({ catalogCriteria, isMaxed, recentlyAdded }) => {
    const showRecentlyAddedIndicator = recentlyAdded && !isMaxed;
    return (
        <div className={css["catalog-item-label"]}>
            <div className={css["action-indicators"]}>
                {isMaxed ? (
                    <span>{Strings.Max}</span>
                ) : (
                    <>
                        <i
                            className={classList(
                                "fas fa-check",
                                css["recently-added-indicator"],
                                showRecentlyAddedIndicator ? undefined : css["hide-indicator"]
                            )}
                            title={lf("Added!")}
                        />
                        <i
                            className={classList(
                                "fas fa-plus",
                                showRecentlyAddedIndicator ? css["hide-indicator"] : undefined
                            )}
                            title={Strings.AddToChecklist}
                        />
                    </>
                )}
            </div>
            <ReadOnlyCriteriaDisplay catalogCriteria={catalogCriteria} showDescription={true} />
        </div>
    );
};

const CatalogList: React.FC = () => {
    const { state: teacherTool } = useContext(AppStateContext);

    const recentlyAddedWindowMs = 500;
    const [recentlyAddedIds, setRecentlyAddedIds] = useState<pxsim.Map<NodeJS.Timeout>>({});

    const criteria = useMemo<CatalogCriteria[]>(
        () => getCatalogCriteria(teacherTool),
        [teacherTool.catalog, teacherTool.checklist]
    );

    function updateRecentlyAddedValue(id: string, value: NodeJS.Timeout | undefined) {
        setRecentlyAddedIds(prevState => {
            const newState = { ...prevState };
            if (value) {
                newState[id] = value;
            } else {
                delete newState[id];
            }
            return newState;
        });
    }

    function onItemClicked(c: CatalogCriteria) {
        addCriteriaToChecklist([c.id]);

        // Set a timeout to remove the recently added indicator
        // and save it in the state.
        if (recentlyAddedIds[c.id]) {
            clearTimeout(recentlyAddedIds[c.id]);
        }
        const timeoutId = setTimeout(() => {
            updateRecentlyAddedValue(c.id, undefined);
        }, recentlyAddedWindowMs);
        updateRecentlyAddedValue(c.id, timeoutId);

        announceToScreenReader(lf("Added '{0}' to checklist.", getReadableCriteriaTemplate(c)));
    }

    return (
        <div className={css["catalog-list"]}>
            {criteria.map(c => {
                const existingInstanceCount = teacherTool.checklist.criteria.filter(
                    i => i.catalogCriteriaId === c.id
                ).length;
                const isMaxed = c.maxCount !== undefined && existingInstanceCount >= c.maxCount;
                return (
                    c.template && (
                        <Button
                            id={`criteria_${c.id}`}
                            title={getReadableCriteriaTemplate(c)}
                            key={c.id}
                            className={css["catalog-item"]}
                            label={
                                <CatalogItemLabel
                                    catalogCriteria={c}
                                    isMaxed={isMaxed}
                                    recentlyAdded={recentlyAddedIds[c.id] !== undefined}
                                />
                            }
                            onClick={() => onItemClicked(c)}
                            disabled={isMaxed}
                        />
                    )
                );
            })}
        </div>
    );
};

interface CatalogOverlayProps {}
export const CatalogOverlay: React.FC<CatalogOverlayProps> = ({}) => {
    const { state: teacherTool } = useContext(AppStateContext);

    function closeOverlay() {
        setCatalogOpen(false);
    }

    return teacherTool.catalogOpen ? (
        <FocusTrap onEscape={() => {}}>
            <div className={css["catalog-overlay"]}>
                <div className={css["catalog-content-container"]}>
                    <CatalogHeader onClose={closeOverlay} />
                    <CatalogList />
                </div>
            </div>
        </FocusTrap>
    ) : null;
};