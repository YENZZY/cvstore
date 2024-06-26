sap.ui.define([
    "store/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/core/Fragment",
    "sap/ui/model/FilterOperator"
],
function (Controller, JSONModel, MessageBox, Filter, Fragment, FilterOperator) {
    "use strict";
 
    return Controller.extend("store.controller.Page", {
        onInit: function () {
            this.getRouter().getRoute("Page").attachMatched(this._onRouteMatched, this);
            var oProductModel = new JSONModel({
                ProductCollection: []
            });
            this.getView().setModel(oProductModel, "productModel");        
        },

        _onRouteMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            this.Uuid = oArgs.Uuid;
            this.storeCode = oArgs.storeCode;
            this.storeName = oArgs.storeName;

            console.log("hi", oArgs);

            // 데이터를 가져오는 함수 호출
            this._getData();
        },

        _getData: function () {
            var oMainModel = this.getOwnerComponent().getModel();
            var oSmanageModel = this.getOwnerComponent().getModel("smanageData");

            if (this.Uuid) {
                var sPath = "/Head(guid'" + this.Uuid + "')";
                console.log(sPath);
                oMainModel.read(sPath, {
                    success: function (oData) {
                        var oStoreModel = new JSONModel(oData);
                        console.log(oStoreModel);
                        this.getView().setModel(oStoreModel, "storeModel");
                    }.bind(this), // 컨텍스트 문제 해결
                    error: function (oError) {
                        MessageBox.error("데이터를 불러올 수 없습니다.");
                    }
                });
                 // 편의점코드 및 편의점명을 select 컴포넌트에 바인딩
            this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                var storecodes = aGetData.filter(function (codedata) {
                    return codedata.StoreStatus === 'Y';
                }).map(function (codedata) {
                    return {
                        StoreCode: codedata.StoreCode,
                        StoreName: codedata.StoreName
                    };
                });
        
                var oCodeModel = new JSONModel({ storecodes: storecodes });
                this.getView().setModel(oCodeModel, "codeModel");
        
                var oStoreModel = this.getView().getModel("storeModel");
                if (oStoreModel) {
                    var oStoreData = oStoreModel.getData();
                    var selectStoreKey = aGetData.find(function (item) {
                        return item.StoreCode === oStoreData.StoreCode;
                    });
                    if (selectStoreKey) {
                        var oSelect = this.getView().byId("selectcvname");
                        oSelect.setSelectedKey(selectStoreKey.StoreCode);
                    }
                }
            }.bind(this)).catch(function () {
                MessageBox.error("브랜드명을 불러올 수 없습니다.");
            });
            }else if (this.storeCode && this.storeName) {
                // storeCode와 storeName을 사용하여 필요한 작업 수행
                // 예를 들어, 특정 데이터를 찾고 모델에 바인딩하는 로직 추가
                this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
                    var oStoreData = aGetData.find(function (item) {
                        return item.StoreCode === this.storeCode && item.StoreName === this.storeName;
                    }.bind(this));

                    if (oStoreData) {
                        var oStoreModel = new JSONModel(oStoreData);
                        this.getView().setModel(oStoreModel, "storeModel");

                        // Select 컨트롤에 선택된 값을 설정하는 예시
                        var oSelect = this.getView().byId("selectcvname");
                        if (oSelect) {
                            oSelect.setSelectedKey(oStoreData.StoreCode);
                        }
                    } else {
                        MessageBox.error("해당 StoreCode와 StoreName을 찾을 수 없습니다.");
                    }
                }.bind(this)).catch(function () {
                    MessageBox.error("데이터를 불러올 수 없습니다.");
                });
            }
    },
            // // 편의점코드 및 편의점명을 select 컴포넌트에 바인딩
            // this._getODataRead(oSmanageModel, "/Smanage").then(function (aGetData) {
            //     var storecodes = aGetData.filter(function (codedata) {
            //         return codedata.StoreStatus === 'Y';
            //     }).map(function (codedata) {
            //         return {
            //             StoreCode: codedata.StoreCode,
            //             StoreName: codedata.StoreName
            //         };
            //     });
            //     var oCodeModel = new JSONModel({ storecodes: storecodes });
            //     this.getView().setModel(oCodeModel, "codeModel");
        
            //     var oStoreModel = this.getView().getModel("storeModel");
            //     if (oStoreModel) {
            //         var oStoreData = oStoreModel.getData();
            //         var selectStoreKey = aGetData.find(function (item) {
            //             return item.StoreCode === oStoreData.StoreCode;
            //         });
            //         if (selectStoreKey) {
            //             var oSelect = this.getView().byId("selectcvname");
            //             oSelect.setSelectedKey(selectStoreKey.StoreCode);
            //         }
            //     }
            // }.bind(this)).catch(function () {
            //     MessageBox.error("브랜드명을 불러올 수 없습니다.");
            // });
            //},

        onCreate: function () {
            var getData = this.getView().getModel("codeModel").getData();
            var selectedStoreCode = this.getView().byId("selectcvname").getSelectedKey();

            // storecodes 배열에서 StoreCode가 일치하는 데이터를 찾습니다.
            var oRowData = getData.storecodes.find(function (item) {
                return item.StoreCode === selectedStoreCode;
            });
            console.log("oRowData:", oRowData);
            if (oRowData) {
                this.getRouter().navTo("Page", {
                    StoreCode: oRowData.StoreCode,
                    StoreName: oRowData.StoreName
                });
            } else {
                console.error("해당 StoreCode를 찾을 수 없습니다.");
            }
        },

        onMove: function () {
            
        },

        onSave: function () {
            this.navTo("Main",{});
        },

        onOrder: function () {
            this._openDialog();
        },

        _openDialog: function () {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment("store.view.Fragments.Dialog", this);
                this.getView().addDependent(this._oDialog);
            }

            var oProductModel = this.getOwnerComponent().getModel("pmanageData");
            this._getODataRead(oProductModel, "/Pmanage").done(
                function (aGetData) {
                    var oProductData = {
                        ProductCollection: aGetData
                    };
                    this.getView().setModel(new JSONModel(oProductData), "productModel");
                    this._oDialog.open();  // 데이터 설정 후 다이얼로그 열기
                
                }.bind(this)).fail(function () {
                    MessageBox.information("상품 조회를 할 수 없습니다.");
                });
        },

        handleSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter("ProductName", FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        handleConfirm: function (oEvent) {
            var aSelectedContexts = oEvent.getParameter("selectedContexts");
            if (aSelectedContexts.length) {
                var oselectModel = this.getView().getModel("selectModel");
                if (!oselectModel) {
                    oselectModel = new JSONModel();
                    this.getView().setModel(oselectModel, "selectModel");
                }
        
                var aSelectedProducts = aSelectedContexts.map(function (oContext) {
                    var oProduct = oContext.getObject();
                    oProduct.ProductStock = 30; 
                    return oProduct;
                });
        
                oselectModel.setProperty("/items", aSelectedProducts);
        
                console.log("선택한 상품", aSelectedProducts);
            }       
            
            this._oDialog._oDialog.close();  // 다이얼로그 닫기
        },

        handleClose: function () {
                this._oDialog._oDialog.close();  // 다이얼로그 닫기
        },

        onBack : function(){
            this.navTo("Main",{});
        }

    });
});
