import { Bag } from "..";
import { Contract } from "../contract";


/**
 * Utility for conversions between contracts and models.
 */
export interface IModelBinder {
    canHandleContract(contract: Contract): boolean;
    canHandleModel(model: any): boolean;

    /**
     * Converts a model to a contract.
     */
    modelToContract(model: any): Contract;

    /**
     * Converts contract to model.
     * @param A contract.
     * @param params Additional parameters needed to create a model.
     */
    contractToModel(contract: any, bindingContext?: Bag<any>): Promise<any>;
}
